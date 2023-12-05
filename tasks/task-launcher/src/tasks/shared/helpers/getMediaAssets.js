export async function getMediaAssets(bucketName, whitelist = {}, language, nextPageToken = '', categorizedObjects = { images: {}, audio: {}, video: {} }) {
  const baseUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o`;
  let url = baseUrl;
  if (nextPageToken) {
    url += `?pageToken=${nextPageToken}`;
  }

  const response = await fetch(url);
  const data = await response.json();

  data.items.forEach(item => {
    if (isLanguageCodeValid(item.name, language) && isWhitelisted(item.name, whitelist)) {
      const contentType = item.contentType;
      const id = item.name;
      const path = `https://storage.googleapis.com/${bucketName}/${id}`;
      const fileName = id.split('/').pop().split('.')[0];
      const camelCaseFileName = convertToCamelCase(fileName);

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
    return listObjects(bucketName, whitelist, language, data.nextPageToken, categorizedObjects);
  } else {
    return categorizedObjects;
  }
}

  // Still needs to be worked on to allow nested whitelisting (whitelisting within an already whitelisted folder)
function isWhitelisted(filePath, whitelist) {
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
  
  
  
function isLanguageCodeValid(filePath, languageCode) {
  const parts = filePath.split('/');
  if (parts.length > 1) {
    return parts[0] === languageCode || parts[0] === 'shared';
  }
  return false;
}

function convertToCamelCase(str) {
  return str.replace(/[-_\.]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^(.)/, c => c.toLowerCase());
}