//@ts-ignore
import { getDevice } from '@bdelab/roar-utils';
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

type HeavyResourcesType = {
  images: Record<string, string>;
  audio: Record<string, string>;
  video: Record<string, string>;
};


export async function getMediaAssets(
  bucketName: string,
  whitelist: Record<string, any> = {},
  language: string,
  taskName: string,
  nextPageToken = '',
  categorizedObjects: CategorizedObjectsType = { images: {}, audio: {}, video: {} },
) {
  const parts = bucketName.split("/"); 
  const bucket = parts[0]; 
  const folder = parts.slice(1).join("/");
  const heavyResources: HeavyResourcesType = {
    images: {},
    audio: {},
    video: {},
  };
  
  const baseUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${folder}/`;
  
  let url = baseUrl;
  if (nextPageToken) {
    url += `&pageToken=${nextPageToken}`;
  }
  
  const response = await fetch(url);
  const data: ResponseDataType = await response.json();

  data.items.forEach((item) => {
    if (isLanguageAndDeviceValid(item.name, taskName, language) && isWhitelisted(item.name, whitelist)) {
      const contentType = item.contentType;
      const id = item.name;
      const path = `https://storage.googleapis.com/${bucket}/${id}`;
      const fileName = id.split('/').pop()?.split('.')[0] || '';
      const camelCaseFileName = camelize(fileName);

      if (contentType.startsWith('image/')) {
        // We want to check if the file is a png or webp
        // If the file is webp and another file of png exists, we want to prioritize the webp file
        if (contentType.includes('png')) {
          if (!categorizedObjects.images[camelCaseFileName]) {
            // No other choice until now, so we add it to the heavy resources
            heavyResources.images[camelCaseFileName] = path;
            categorizedObjects.images[camelCaseFileName] = path;
          }
          // do not add since key already exists
        } else {
          // add or replace lighter resource to the path
          categorizedObjects.images[camelCaseFileName] = path;
          // remove the heavy resource if it exists
          if (heavyResources.images[camelCaseFileName]) {
            delete heavyResources.images[camelCaseFileName];
          }
        }
      } else if (contentType.startsWith('audio/')) {
        categorizedObjects.audio[camelCaseFileName] = path;
      } else if (contentType.startsWith('video/')) {
        categorizedObjects.video[camelCaseFileName] = path;
      }
    }
  });

  if (data.nextPageToken) {
    return getMediaAssets(bucketName, whitelist, taskName, language, data.nextPageToken, categorizedObjects);
  } else {
    if (Object.keys(heavyResources.images).length > 0) {
      console.log('mark://heavyResources', heavyResources);
      
    }
    return categorizedObjects;
  }
}

function isLanguageAndDeviceValid(filePath: string, languageCode: string, taskName: string) {
  const parts = filePath.split('/');
  
  if (parts.length !== 3) {
    return false
  }
  else if (parts[0] === 'visual') { // visual assets have task prefix
    return parts[1] === taskName && parts[2].length !== 0;
  }
  else if (parts[0] === 'audio') { // audio assets have language prefix
    return parts[1] == languageCode && parts[2].length !== 0;
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
