// Read-only inventory of variant params, and of the params copies saved in administrations,
// in a Levante Firestore project.
// Usage: node launch-params-assessment/scripts/firestore-readonly-scan.mjs [projectId]   (default: hs-levante-admin-dev)
import { writeFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.argv[2] ?? 'hs-levante-admin-dev';
initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

// 1. Top-level collections, to find where the variant param spec catalog lives.
const rootCollections = await db.listCollections();
console.log('Root collections:', rootCollections.map((c) => c.id).join(', '));

// 2. Every variant doc under tasks/{taskId}/variants.
const snap = await db.collectionGroup('variants').get();
const keys = {};
const rows = [];

snap.forEach((doc) => {
  const taskId = doc.ref.parent.parent?.id;
  const params = doc.data().params ?? {};
  const { name, registered, lastUpdated } = doc.data();
  rows.push({ taskId, variantId: doc.id, name, registered, lastUpdated: lastUpdated?.toDate?.() ?? lastUpdated, params });

  for (const [key, value] of Object.entries(params)) {
    keys[key] ??= { count: 0, tasks: new Set(), values: new Set() };
    keys[key].count++;
    keys[key].tasks.add(taskId);
    keys[key].values.add(JSON.stringify(value));
  }
});

console.log(`\n${snap.size} variant docs, ${Object.keys(keys).length} distinct param keys\n`);
const summary = Object.entries(keys)
  .sort(([, a], [, b]) => b.count - a.count)
  .map(([key, { count, tasks, values }]) => ({
    key,
    variants: count,
    tasks: [...tasks].sort().join(' '),
    values: [...values].slice(0, 8).join(' | ') + (values.size > 8 ? ` (+${values.size - 8} more)` : ''),
  }));
console.table(summary);

writeFileSync(`variants-${projectId}.json`, JSON.stringify(rows, null, 2));
writeFileSync(`param-keys-${projectId}.json`, JSON.stringify(summary, null, 2));
console.log(`\nWrote variants-${projectId}.json and param-keys-${projectId}.json`);

// 3. The params copy in every administrations/{adminId}.assessments[] entry. startTask returns
// this copy (not the variant doc) as variantParams, so it is what existing assignments launch with.
// Null and absent are treated as equal, as in setSharedConfig and the dashboard's own comparison.
const toDate = (v) => v?.toDate?.() ?? v ?? null;
const withoutNulls = (params) => Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== null));
const stable = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x));

const variantsById = new Map(rows.map((r) => [`${r.taskId}/${r.variantId}`, r]));
const adminSnap = await db.collection('administrations').get();
const adminRows = [];

adminSnap.forEach((doc) => {
  const { name, publicName, dateOpened, dateClosed, dateCreated, assessments = [] } = doc.data();
  for (const assessment of assessments) {
    const variant = variantsById.get(`${assessment.taskId}/${assessment.variantId}`);
    const adminParams = withoutNulls(assessment.params);
    const variantParams = variant ? withoutNulls(variant.params) : null;

    const changedKeys = variantParams
      ? [...new Set([...Object.keys(adminParams), ...Object.keys(variantParams)])]
          .filter((k) => stable(adminParams[k]) !== stable(variantParams[k]))
          .sort()
      : null;

    adminRows.push({
      adminId: doc.id,
      adminName: name ?? publicName ?? null,
      dateCreated: toDate(dateCreated),
      dateOpened: toDate(dateOpened),
      dateClosed: toDate(dateClosed),
      taskId: assessment.taskId,
      variantId: assessment.variantId,
      variantName: assessment.variantName ?? null,
      variantFound: !!variant,
      variantRegistered: variant?.registered ?? null,
      differsFromVariant: changedKeys ? changedKeys.length > 0 : null,
      changedKeys,
      params: assessment.params ?? {},
    });
  }
});

const differing = adminRows.filter((r) => r.differsFromVariant);
console.log(
  `\n${adminSnap.size} administrations, ${adminRows.length} assessments: ` +
    `${differing.length} differ from their current variant, ` +
    `${adminRows.filter((r) => !r.variantFound).length} point at a variant that no longer exists, ` +
    `${adminRows.filter((r) => r.variantFound && r.variantRegistered !== true).length} use an unregistered variant`,
);

writeFileSync(`administrations-${projectId}.json`, JSON.stringify(adminRows, null, 2));
console.log(`Wrote administrations-${projectId}.json`);
