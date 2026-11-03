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

export function languageAudioFromStems(
  bucket: string,
  folder: string,
  names: string[],
  stems: ReadonlySet<string>,
): CategorizedObjectsType {
  const audio: Record<string, string> = {};
  for (const name of names) {
    const stem = audioStem(name);
    if (!stem || !stems.has(stem)) continue;
    audio[camelize(stem)] = `https://storage.googleapis.com/${bucket}/${folder}/${stem}.mp3`;
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
  let folder = parts.slice(1).join('/');
  let names = await listObjectNames(bucket, folder);
  if (names.length === 0 && folder === 'audio/en-US') {
    folder = 'audio/en';
    names = await listObjectNames(bucket, folder);
  } else if (names.length === 0 && folder === 'audio/de-DE') {
    folder = 'audio/de';
    names = await listObjectNames(bucket, folder);
  }

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
  language: string,
  taskName: string,
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

  let data: ResponseDataType;
  let response: Response;

  response = await fetch(url);
  data = await response.json();

  // add temporary fallback for en-US and de-DE until we have the correct folders in the bucket
  if (!data.items || data.items.length === 0) {
    if (folder === 'audio/en-US') {
      response = await fetch(
        `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=audio/en/&fields=${LIST_FIELDS}`,
      );
      data = await response.json();
    } else if (folder === 'audio/de-DE') {
      response = await fetch(
        `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=audio/de/&fields=${LIST_FIELDS}`,
      );
      data = await response.json();
    }
  }

  data.items.forEach((item) => {
    if (isLanguageAndDeviceValid(item.name, language, taskName) && isWhitelisted(item.name, whitelist)) {
      const contentType = item.contentType;
      const id = item.name;
      const path = `https://storage.googleapis.com/${bucket}/${id}`;
      const fileName = id.split('/').pop()?.split('.')[0] || '';
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
    return getMediaAssets(bucketName, whitelist, language, taskName, data.nextPageToken, categorizedObjects);
  } else {
    return categorizedObjects;
  }
}

function isLanguageAndDeviceValid(filePath: string, languageCode: string, taskName: string) {
  const parts = filePath.split('/');

  if (parts.length !== 3) {
    return false;
  } else if (parts[0] === 'visual') {
    // visual assets have task prefix
    return parts[1] === taskName && parts[2].length !== 0;
  } else if (parts[0] === 'audio') {
    // audio assets have language prefix
    return (parts[1] === languageCode || parts[1] === languageCode.slice(0, 2)) && parts[2].length !== 0;
  }

  return false; // Not a valid path
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
