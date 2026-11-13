import { camelize } from './camelize';

type CategorizedObjectsType = {
  images: Record<string, string>;
  audio: Record<string, string>;
  video: Record<string, string>;
};

type ResponseItemType = {
  name: string;
  contentType: string;
};

type ResponseDataType = {
  items: ResponseItemType[];
  nextPageToken: string;
};

const LIST_FIELDS = 'items(name,contentType),nextPageToken';
const NAME_FIELDS = 'items(name),nextPageToken';

export type LanguageAudioListing = {
  bucket: string;
  folder: string;
  stems: Set<string>;
};

function audioStem(fileName: string) {
  const base = fileName.split('/').pop() ?? '';
  if (base.endsWith('.mp3')) return base.slice(0, -4);
  return base.split('.')[0] ?? '';
}

type ReferencedAudioRow = {
  audioFile?: string | string[];
  distractors?: Array<string | number>;
  animationAudioTriggers?: string[];
  answer?: string | number;
};

type ReferencedAudioCorpus = {
  stimulus?: ReferencedAudioRow[];
  downex?: ReferencedAudioRow[];
};

function pushAudioName(names: string[], value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    names.push(value.trim());
    return;
  }
  if (!Array.isArray(value)) return;
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) names.push(item.trim());
  }
}

// Clips the shared shell plays on every task. Translation keys are text and are not included.
const SHARED_AUDIO_KEYS = [
  'inputAudioCue',
  'nullAudio',
  'taskFinished',
  'generalRepeatInstructions',
  'feedbackGoodJob',
  'feedbackCorrect',
  'feedbackNotQuiteRight',
  'feedbackTryAgain',
];

// Instruction and feedback clips named in task code, outside the corpus audio_file column.
const TASK_INSTRUCTION_AUDIO: Record<string, string[]> = {
  intro: [
    'generalIntro1',
    'generalIntro4',
    'instructBubble1Mouse',
    'instructBubble1Touch',
    'instructBubble2',
    'instructBubble3',
    'instructBubble4',
    'instructBubble5',
    'instructBubble5Mouse',
    'instructBubble5Touch',
    'pop',
    'select',
  ],
  'hearts-and-flowers': [
    'coin',
    'flowerInstruct1',
    'heartInstruct1',
    'heartsAndFlowersInstruct1',
    'heartsAndFlowersInstruct2',
    'heartsAndFlowersInstruct3',
    'heartsAndFlowersInstruct4',
  ],
  'memory-game': [
    'heartsAndFlowersEncourage2',
    'heartsAndFlowersPlayTime',
    'memoryGameInstruct1',
    'memoryGameInstruct2',
    'memoryGameInstruct2Downex',
    'memoryGameInstruct3Downex',
    'memoryGameInstruct4',
    'memoryGameInstruct4Downex',
    'memoryGameInstruct5',
    'memoryGameInstruct5Downex',
    'memoryGameInstruct6',
    'memoryGameInstruct6Downex',
    'memoryGameInstruct7Downex',
    'memoryGameInstruct8Downex',
    'memoryGameInstruct9Downex',
    'memoryGameInstruct10Downex',
    'memoryGameInstruct11Downex',
    'memoryGameDisplay',
    'memoryGameInput',
    'memoryGameBackwardPrompt',
    'memoryGameFeedbackIncorrectDownex',
  ],
  'mental-rotation': [
    'mentalRotationInstruct1',
    'mentalRotationInstruct3D',
    'mentalRotationTrainingInstruct2',
    'mentalRotationTrainingInstruct3',
    'mentalRotationFeedbackIncorrectDownex',
    'mental-rotation-instruct1',
    'mental-rotation-instruct1-part1-downex',
    'mental-rotation-instruct1-part2-downex',
    'mental-rotation-instruct2-downex',
    'mental-rotation-instruct3-downex',
    'mental-rotation-instruct4-downex',
    'mental-rotation-training-instruct2',
    'mental-rotation-training-instruct3',
  ],
  'matrix-reasoning': [
    'feedbackRightOne',
    'matrixReasoningInstruct1',
    'matrixReasoningFeedbackIncorrectDownex',
    'matrixReasoningFeedbackSmBlueDownex',
    'matrix-reasoning-instruct1-part1-downex',
    'matrix-reasoning-instruct1-part3-downex',
    'matrix-reasoning-instruct1-part4-downex',
    'matrix-reasoning-instruct2-part1-downex',
    'matrix-reasoning-instruct2-part2-downex',
    'matrix-reasoning-instruct2-part3-downex',
    'matrix-reasoning-instruct2-part4-downex',
    'matrix-reasoning-instruct2-part5-downex',
    'matrix-reasoning-instruct3-downex',
    'matrix-reasoning-instruct4-downex',
    'matrix-reasoning-instruct5-part1-downex',
    'matrix-reasoning-instruct5-part2-downex',
    'matrix-reasoning-prompt1-part1-downex',
    'matrix-reasoning-prompt1-part2-downex',
  ],
  'same-different-selection': [
    'sds-match-demo1-heavy',
    'sds-match-demo2-heavy',
    'sds-pick-square-demo-heavy',
    'sdsPrompt3DemoHeavy',
    'sdsPrompt3DemoHeavyPart1',
    'sdsPrompt3DemoHeavyPart2',
    'sdsPrompt3Heavy',
    'sdsFeedbackBothBlue',
    'sdsFeedbackBothLarge',
    'sameDifferentSelectionBothRedHeavy',
    'sameDifferentSelectionBothTrianglesHeavy',
    'sameDifferentSelectionBothYellowHeavy',
    'same-different-selection-highlight-1',
    'same-different-selection-highlight-2',
  ],
  'roar-inference': ['inferenceInstructions', 'inferenceInstructions2'],
};

const STAGGERED_AUDIO_TASKS = new Set(['theory-of-mind', 'child-survey']);

export function referencedAudioNames(taskName: string, corpora: ReferencedAudioCorpus | undefined): string[] {
  const names = [...SHARED_AUDIO_KEYS, ...(TASK_INSTRUCTION_AUDIO[taskName] ?? [])];
  const includeResponseAudio = STAGGERED_AUDIO_TASKS.has(taskName);

  for (const row of [...(corpora?.stimulus ?? []), ...(corpora?.downex ?? [])]) {
    pushAudioName(names, row.audioFile);
    pushAudioName(names, row.animationAudioTriggers);
    if (!includeResponseAudio) continue;
    pushAudioName(names, row.distractors);
    pushAudioName(names, row.answer);
  }

  return names;
}

export function languageAudioFromStems(
  bucket: string,
  folder: string,
  names: string[],
  stems: ReadonlySet<string>,
): CategorizedObjectsType {
  const stemsByCamel = new Map<string, string>();
  for (const stem of stems) {
    const key = camelize(stem);
    if (key) stemsByCamel.set(key, stem);
  }

  const audio: Record<string, string> = {};
  for (const name of names) {
    const camelName = camelize(name);
    const stem = stemsByCamel.get(camelName);
    if (!stem) continue;
    audio[camelName] = `https://storage.googleapis.com/${bucket}/${folder}/${stem}.mp3`;
  }
  return { images: {}, audio, video: {} };
}

async function listObjectNames(bucket: string, folder: string) {
  const names: string[] = [];
  let pageToken = '';
  do {
    let url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${folder}/&fields=${NAME_FIELDS}`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error listing ${folder}: ${response.status}`);

    const data = (await response.json()) as { items?: { name: string }[]; nextPageToken?: string };
    for (const item of data.items ?? []) names.push(item.name);
    pageToken = data.nextPageToken ?? '';
  } while (pageToken);

  return names;
}

export async function listLanguageAudio(bucketName: string): Promise<LanguageAudioListing> {
  const parts = bucketName.split('/');
  const bucket = parts[0];
  const folder = parts.slice(1).join('/');
  const names = await listObjectNames(bucket, folder);

  const stems = new Set<string>();
  for (const name of names) {
    const base = name.split('/').pop() ?? '';
    if (!base.endsWith('.mp3')) continue;
    stems.add(audioStem(base));
  }

  return { bucket, folder, stems };
}

export async function getMediaAssets(
  bucketName: string,
  whitelist: Record<string, any> = {},
  taskName: string,
  language: string,
  nextPageToken = '',
  categorizedObjects: CategorizedObjectsType = { images: {}, audio: {}, video: {} },
) {
  const parts = bucketName.split('/');
  const bucket = parts[0];
  const folder = parts.slice(1).join('/');
  const baseUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${folder}/&fields=${LIST_FIELDS}`;

  let url = baseUrl;
  if (nextPageToken) {
    url += `&pageToken=${nextPageToken}`;
  }

  const response = await fetch(url);
  const data: ResponseDataType = await response.json();

  data.items.forEach((item) => {
    if (isLanguageAndTaskValid(item.name, taskName, language) && isWhitelisted(item.name, whitelist)) {
      const contentType = item.contentType;
      const id = item.name;
      const path = `https://storage.googleapis.com/${bucket}/${id}`;
      const fileName =
        id
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, '') || '';
      const camelCaseFileName = camelize(fileName);

      if (contentType.startsWith('image/')) {
        categorizedObjects.images[camelCaseFileName] = path;
      } else if (contentType.startsWith('audio/')) {
        categorizedObjects.audio[camelCaseFileName] = path;
      } else if (contentType.startsWith('video/')) {
        categorizedObjects.video[camelCaseFileName] = path;
      }
    }
  });

  if (data.nextPageToken) {
    return getMediaAssets(bucketName, whitelist, taskName, language, data.nextPageToken, categorizedObjects);
  }
  return categorizedObjects;
}

function isLanguageAndTaskValid(filePath: string, taskName: string, languageCode: string) {
  const parts = filePath.split('/');
  if (parts.length !== 3) {
    return false;
  }

  const assetType = parts[0];
  if (assetType === 'audio') {
    return parts[1] === languageCode && parts[2].length !== 0;
  }

  if (assetType === 'visual') {
    return parts[1] === taskName && parts[2].length !== 0;
  }

  return false;
}

// TODO: allow nested whitelisting (whitelisting within an already whitelisted folder)
function isWhitelisted(filePath: string, whitelist: Record<string, string[]>) {
  const parts = filePath.split('/');
  for (const [parent, children] of Object.entries(whitelist)) {
    const parentIndex = parts.indexOf(parent);
    if (parentIndex !== -1 && parts.length > parentIndex + 1) {
      const childFolder = parts[parentIndex + 1];
      if (children.includes(childFolder)) {
        return true;
      } else {
        return false; // Whitelist applies, but this folder is not allowed
      }
    }
  }
  return true; // Whitelist does not apply to this file's level
}
