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

const AUDIO_PREFIX_FALLBACKS: Record<string, string> = {
  'audio/en-US': 'audio/en',
  'audio/de-DE': 'audio/de',
  'audio/es': 'audio/es-CO',
  'audio/es-US': 'audio/es-CO',
};

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
  const baseUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${folder}/`;

  let url = baseUrl;
  if (nextPageToken) {
    url += `&pageToken=${nextPageToken}`;
  }

  let data: ResponseDataType;
  let response: Response;

  response = await fetch(url);
  data = await response.json();

  if (!data.items || data.items.length === 0) {
    const fallbackPrefix = AUDIO_PREFIX_FALLBACKS[folder];
    if (fallbackPrefix) {
      response = await fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${fallbackPrefix}/`);
      data = await response.json();
    }
  }

  if (!data.items) {
    data.items = [];
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

function audioFolderMatchesLanguage(folderLang: string, languageCode: string) {
  return folderLang === languageCode || folderLang.slice(0, 2) === languageCode.slice(0, 2);
}

function isLanguageAndDeviceValid(filePath: string, languageCode: string, taskName: string) {
  const parts = filePath.split('/');

  if (parts.length !== 3) {
    return false;
  } else if (parts[0] === 'visual') {
    // visual assets have task prefix
    return parts[1] === taskName && parts[2].length !== 0;
  } else if (parts[0] === 'audio') {
    return audioFolderMatchesLanguage(parts[1], languageCode) && parts[2].length !== 0;
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
