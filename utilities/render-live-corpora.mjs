/**
 * Rewrite docs/live-corpora.md from variants registered in Firestore.
 *
 * Auth, in order: a service-account path from the environment, then
 * Application Default Credentials (`gcloud auth application-default print-access-token`
 * or `gcloud auth print-access-token`). A .env in this folder, the repo root,
 * or the current directory is loaded and does not override the shell.
 *
 *   node render-live-corpora.mjs prod
 *   node render-live-corpora.mjs prod --check
 */

import { execFileSync } from 'node:child_process';
import { createSign } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const UTILITIES_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(UTILITIES_DIR, '..');
const DEFAULT_OUT = path.join(REPO_ROOT, 'docs', 'live-corpora.md');
const CONFIG_TS = path.join(
  REPO_ROOT,
  'task-launcher/src/tasks/shared/helpers/config.ts',
);
const TASKS_DIR = path.join(REPO_ROOT, 'task-launcher/src/tasks');
const REFRESHED_PREFIX = '_Last refreshed ';

const BUCKETS = {
  prod: 'levante-assets-prod',
  dev: 'levante-assets-dev',
};

const PROJECT_IDS = {
  prod: 'hs-levante-admin-prod',
  dev: 'hs-levante-admin-dev',
};

// Folder name differs from the Firestore task id.
const FOLDER_TASK_IDS = {
  math: 'egma-math',
};

// Keep the published doc in this order. Newly added task folders follow, sorted.
const TASK_ORDER = [
  'egma-math',
  'matrix-reasoning',
  'mental-rotation',
  'same-different-selection',
  'trog',
  'vocab',
  'theory-of-mind',
  'hearts-and-flowers',
  'memory-game',
  'intro',
  'child-survey',
  'adult-reasoning',
];

const LANGUAGE_ALIASES = {
  de: 'de-DE',
  en: 'en-US',
  es: 'es-CO',
};

const LABEL_OVERRIDES = {
  trog: 'Sentence Understanding',
};

const CROWDIN_SLUGS = {
  'egma-math': 'math',
  'memory-game': 'memory',
};

function loadEnvFile(filePath) {
  let text;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[name]) process.env[name] = value;
  }
}

for (const envPath of [
  path.join(UTILITIES_DIR, '.env'),
  path.join(REPO_ROOT, '.env'),
  path.resolve(process.cwd(), '.env'),
]) {
  loadEnvFile(envPath);
}

function camelize(value) {
  return value.replace(/^([A-Z])|[\s\-_](\w)/g, (_match, first, second) => {
    if (second) return second.toUpperCase();
    return first.toLowerCase();
  });
}

function prettifySlug(slug) {
  const words = String(slug)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!words) return 'General';
  return words.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function taskDisplayLabel(taskId) {
  if (LABEL_OVERRIDES[taskId]) return LABEL_OVERRIDES[taskId];
  return prettifySlug(CROWDIN_SLUGS[taskId] ?? taskId);
}

function taskIdsFromRepo() {
  const ids = new Set();
  for (const entry of readdirSync(TASKS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'shared') continue;
    ids.add(FOLDER_TASK_IDS[entry.name] ?? entry.name);
  }
  const ordered = TASK_ORDER.filter((id) => ids.has(id));
  const rest = [...ids].filter((id) => !TASK_ORDER.includes(id)).sort();
  return [...ordered, ...rest];
}

function loadDefaultCorpus() {
  const text = readFileSync(CONFIG_TS, 'utf8');
  const match = text.match(/const defaultCorpus[^{]*\{([^}]+)\}/s);
  if (!match) {
    throw new Error(`Could not find defaultCorpus in ${CONFIG_TS}`);
  }
  const defaults = {};
  for (const pair of match[1].matchAll(/(\w+)\s*:\s*(['"])([^'"]+)\2/g)) {
    defaults[pair[1]] = pair[3];
  }
  return defaults;
}

function credentialsPath(environment) {
  const specific = process.env[`GOOGLE_APPLICATION_CREDENTIALS_${environment.toUpperCase()}`];
  const fallback = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return (specific || fallback || '').trim();
}

function projectIdFor(environment) {
  // The CLI argument selects the Firebase project. GOOGLE_CLOUD_PROJECT,
  // GCLOUD_PROJECT, FIREBASE_PROJECT, and a service-account key's project_id
  // are ignored: a .env often sets them for another project, and the markdown
  // and GCS bucket still follow the argument.
  const projectId = PROJECT_IDS[environment];
  if (!projectId) throw new Error(`Unknown environment: ${environment}`);
  return projectId;
}

function unwrapFirestoreValue(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) {
    const fields = value.mapValue.fields ?? {};
    return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, unwrapFirestoreValue(field)]));
  }
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(unwrapFirestoreValue);
  return undefined;
}

async function accessTokenFromServiceAccount(key) {
  const now = Math.floor(Date.now() / 1000);
  const encoded = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64url');
  const unsigned = `${encoded({ alg: 'RS256', typ: 'JWT' })}.${encoded({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  const assertion = `${unsigned}.${sign.sign(key.private_key).toString('base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error_description || body.error || 'Could not exchange the service-account key for an access token.');
  }
  return body.access_token;
}

function accessTokenFromGcloud() {
  const commands = [
    ['auth', 'application-default', 'print-access-token'],
    ['auth', 'print-access-token'],
  ];
  for (const args of commands) {
    try {
      const token = execFileSync('gcloud', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (token) return token;
    } catch {
      // Try the next logged-in credential.
    }
  }
  return '';
}

async function googleAuth(environment) {
  const keyPath = credentialsPath(environment);
  if (keyPath) {
    let key;
    try {
      key = JSON.parse(readFileSync(keyPath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`Service account key not found: ${keyPath}`);
      throw error;
    }
    const token = await accessTokenFromServiceAccount(key);
    return { token, projectId: projectIdFor(environment) };
  }
  const token = accessTokenFromGcloud();
  if (!token) {
    throw new Error(
      'No Google credentials found. Log in with `gcloud auth application-default login`, or set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON path.',
    );
  }
  return { token, projectId: projectIdFor(environment) };
}

async function fetchRegistered(auth, taskIds) {
  const tasks = {};
  for (const taskId of taskIds) {
    const url = `https://firestore.googleapis.com/v1/projects/${auth.projectId}/databases/(default)/documents/tasks/${encodeURIComponent(taskId)}:runQuery`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'variants' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'registered' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
        },
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      const message = body.error?.message || response.statusText;
      throw new Error(`Firestore query failed for ${taskId}: ${message}`);
    }
    tasks[taskId] = body.flatMap((entry) => {
      const fields = entry.document?.fields;
      return fields ? [unwrapFirestoreValue({ mapValue: { fields } })] : [];
    });
  }
  return tasks;
}

function corpusValue(data) {
  const params = data.params && typeof data.params === 'object' ? data.params : {};
  const raw = data.corpus ?? params.corpus;
  if (raw == null) return '';
  return String(raw).trim();
}

function collectLiveCorpora(registered, defaultCorpus) {
  const byTask = {};
  const noCorpus = {};
  const registeredCounts = {};

  for (const [taskId, variants] of Object.entries(registered)) {
    registeredCounts[taskId] = variants.length;
    const fallback = defaultCorpus[camelize(taskId)] ?? '';
    for (const variant of variants) {
      const params = variant.params && typeof variant.params === 'object' ? variant.params : {};
      const explicit = corpusValue(variant);
      const corpus = explicit || fallback;
      if (!corpus) {
        noCorpus[taskId] = (noCorpus[taskId] ?? 0) + 1;
        continue;
      }
      byTask[taskId] ??= {};
      byTask[taskId][corpus] ??= { languages: new Set(), fromVariant: 0, fromDefault: 0 };
      const row = byTask[taskId][corpus];
      const language = LANGUAGE_ALIASES[String(params.language ?? '').trim()] ?? String(params.language ?? '').trim();
      if (language) row.languages.add(language);
      if (explicit) row.fromVariant += 1;
      else row.fromDefault += 1;
    }
  }

  return { byTask, noCorpus, registeredCounts };
}

function publicCorpusUrl(environment, taskId, corpus) {
  const bucket = BUCKETS[environment];
  return `https://storage.googleapis.com/${bucket}/corpus/${encodeURIComponent(taskId)}/${encodeURIComponent(corpus)}.csv?alt=media`;
}

function howChosen(row) {
  if (row.fromVariant && row.fromDefault) {
    return '`params.corpus`, and the code default when a variant omits it';
  }
  if (row.fromDefault) {
    return 'code default (`config.ts`); variants omit `params.corpus`';
  }
  return '`params.corpus`';
}

function fileCell(url, corpus, present) {
  const link = `[${corpus}.csv](${url})`;
  if (present === false) return `${link} (missing on GCS)`;
  return link;
}

function variantWord(count) {
  return count === 1 ? 'variant' : 'variants';
}

async function corpusPresence(environment, byTask) {
  const presence = {};
  const checks = [];
  for (const [taskId, corpora] of Object.entries(byTask)) {
    for (const corpus of Object.keys(corpora)) {
      const url = publicCorpusUrl(environment, taskId, corpus);
      checks.push(
        fetch(url, { method: 'HEAD' }).then(
          (response) => {
            if (response.ok) presence[`${taskId}/${corpus}`] = true;
            else if (response.status === 404) presence[`${taskId}/${corpus}`] = false;
            else presence[`${taskId}/${corpus}`] = null;
          },
          () => {
            presence[`${taskId}/${corpus}`] = null;
          },
        ),
      );
    }
  }
  await Promise.all(checks);
  return presence;
}

function renderMarkdown({ environment, byTask, noCorpus, registeredCounts, presence, refreshedAt }) {
  const taskIds = taskIdsFromRepo().filter((taskId) => registeredCounts[taskId]);
  const bucket = BUCKETS[environment];
  const lines = [
    '# Live corpora',
    '',
    'Task code in this repo does not include item banks. A registered variant loads',
    '`params.corpus` from the assets bucket. When that param is absent, the task',
    'uses `defaultCorpus` in `task-launcher/src/tasks/shared/helpers/config.ts`.',
    '',
    'URL pattern:',
    `\`https://storage.googleapis.com/${bucket}/corpus/{taskId}/{corpus}.csv?alt=media\``,
    '',
    'Update this file with the refresh-live-corpora skill, or `node utilities/render-live-corpora.mjs prod`. Do not edit it by hand.',
    '',
    `${REFRESHED_PREFIX}${refreshedAt} from **${environment}** variants (\`tasks/{taskId}/variants\` where \`registered == true\`)._`,
    '',
  ];

  for (const taskId of taskIds) {
    const count = registeredCounts[taskId] ?? 0;
    lines.push(`## ${taskDisplayLabel(taskId)} (\`${taskId}\`)`, '');
    lines.push(`${count} registered ${variantWord(count)}.`, '');
    const corpora = byTask[taskId] ?? {};
    const names = Object.keys(corpora).sort();
    if (names.length === 0) {
      lines.push('No corpus file. Trials are defined in the task code.', '');
      continue;
    }
    lines.push('| Corpus | Languages | Variants | How chosen | File |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const corpus of names) {
      const row = corpora[corpus];
      const languages = [...row.languages].sort().map((language) => `\`${language}\``).join(', ') || '(not set)';
      const uses = row.fromVariant + row.fromDefault;
      const url = publicCorpusUrl(environment, taskId, corpus);
      const present = presence[`${taskId}/${corpus}`];
      lines.push(`| \`${corpus}\` | ${languages} | ${uses} | ${howChosen(row)} | ${fileCell(url, corpus, present)} |`);
    }
    const omitted = noCorpus[taskId] ?? 0;
    if (omitted) {
      lines.push('');
      lines.push(`${omitted} registered ${variantWord(omitted)} set no corpus, and this task has no code default.`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

function canonical(text) {
  const kept = text.split('\n').filter((line) => !line.startsWith(REFRESHED_PREFIX));
  return `${kept.join('\n').trim()}\n`;
}

function refreshedAtNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function parseArgs(argv) {
  const args = { environment: 'prod', check: false, out: DEFAULT_OUT };
  for (const arg of argv) {
    if (arg === '--check') args.check = true;
    else if (arg === 'prod' || arg === 'dev') args.environment = arg;
    else if (arg.startsWith('--out=')) args.out = path.resolve(arg.slice('--out='.length));
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const defaultCorpus = loadDefaultCorpus();
  const auth = await googleAuth(args.environment);
  const registered = await fetchRegistered(auth, taskIdsFromRepo());
  const collected = collectLiveCorpora(registered, defaultCorpus);
  const presence = await corpusPresence(args.environment, collected.byTask);
  const markdown = renderMarkdown({
    environment: args.environment,
    ...collected,
    presence,
    refreshedAt: refreshedAtNow(),
  });

  let existing = '';
  try {
    existing = readFileSync(args.out, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const stale = canonical(existing) !== canonical(markdown);

  if (args.check) {
    if (stale) {
      console.log(`live corpora list is stale: ${args.out}`);
      process.exitCode = 1;
      return;
    }
    console.log(`live corpora list is current: ${args.out}`);
    return;
  }

  if (!stale && existing) {
    console.log(`live corpora list is current: ${args.out}`);
    return;
  }

  mkdirSync(path.dirname(args.out), { recursive: true });
  writeFileSync(args.out, markdown);
  console.log(`Wrote ${args.out}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
