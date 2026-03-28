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

export async function getMediaAssets(
  bucketName: string,
  whitelist: Record<string, any> = {},
  taskName: string,
  language: string,
  requiredAssetNames?: string[],
  nextPageToken = '',
  categorizedObjects: CategorizedObjectsType = { images: {}, audio: {}, video: {} }
) {
  const parts = bucketName.split('/');
  const bucket = parts[0];
  const folder = parts.slice(1).join('/');
  const prefix = folder ? `${folder}/` : '';

  if (requiredAssetNames) {
    requiredAssetNames.forEach((assetName) => {
      const path = `https://storage.googleapis.com/${bucket}/${prefix}${assetName}.mp3`;

      categorizedObjects.audio[camelize(assetName)] = path;
    });

    return categorizedObjects;
  } else {
    const baseUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o`;
    const params = new URLSearchParams({ prefix, fields: 'items(name,contentType),nextPageToken' });

    let url = baseUrl;
    if (nextPageToken) {
      params.set('pageToken', nextPageToken);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    const data: ResponseDataType = await response.json();

    data.items.forEach((item) => {
      if (isLanguageAndTaskValid(item.name, taskName, language) && isWhitelisted(item.name, whitelist)) {
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
      return getMediaAssets(bucketName, whitelist, taskName, language, requiredAssetNames, data.nextPageToken, categorizedObjects);
    } else {
      return categorizedObjects;
    }
  }
}

function isLanguageAndTaskValid(filePath: string, taskName: string, languageCode: string) {
  const parts = filePath.split('/');
  if (parts.length < 3) {
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
