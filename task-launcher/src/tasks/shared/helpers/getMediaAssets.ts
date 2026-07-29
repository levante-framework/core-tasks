import { isOfflineAssets, resolveListUrl, resolveObjectUrl } from './assetBase';
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
  items?: ResponseItemType[];
  nextPageToken?: string;
};

const AUDIO_FOLDER_FALLBACKS: Record<string, string> = {
  'audio/en-US': 'audio/en',
  'audio/de-DE': 'audio/de',
  'audio/zh-CN': 'audio/zh',
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
  const url = resolveListUrl(bucket, folder, nextPageToken);

  let data: ResponseDataType;
  let response: Response;

  response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch media list (${response.status}): ${url}`);
  }
  data = await response.json();

  if (!data.items || data.items.length === 0) {
    const fallbackFolder = AUDIO_FOLDER_FALLBACKS[folder];
    if (fallbackFolder) {
      response = await fetch(resolveListUrl(bucket, fallbackFolder));
      if (!response.ok) {
        throw new Error(`Failed to fetch media list (${response.status}): ${resolveListUrl(bucket, fallbackFolder)}`);
      }
      data = await response.json();
    }
  }

  (data.items || []).forEach((item) => {
    if (isLanguageAndDeviceValid(item.name, language, taskName) && isWhitelisted(item.name, whitelist)) {
      const contentType = item.contentType;
      const id = item.name;
      const path = resolveObjectUrl(bucket, id);
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

  if (data.nextPageToken && !isOfflineAssets()) {
    return getMediaAssets(bucketName, whitelist, language, taskName, data.nextPageToken, categorizedObjects);
  }
  return categorizedObjects;
}

function isLanguageAndDeviceValid(filePath: string, languageCode: string, taskName: string) {
  const parts = filePath.split('/');

  if (parts.length !== 3) {
    return false;
  } else if (parts[0] === 'visual') {
    return parts[1] === taskName && parts[2].length !== 0;
  } else if (parts[0] === 'audio') {
    return (parts[1] === languageCode || parts[1] === languageCode.slice(0, 2)) && parts[2].length !== 0;
  }

  return false;
}

function isWhitelisted(filePath: string, whitelist: Record<string, string[]>) {
  const parts = filePath.split('/');
  for (const [parent, children] of Object.entries(whitelist)) {
    const parentIndex = parts.indexOf(parent);
    if (parentIndex !== -1 && parts.length > parentIndex + 1) {
      const childFolder = parts[parentIndex + 1];
      if (children.includes(childFolder)) {
        return true;
      } else {
        return false;
      }
    }
  }
  return true;
}
