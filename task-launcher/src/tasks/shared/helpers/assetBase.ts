const GCS_HOST = 'https://storage.googleapis.com';

let assetBaseUrl: string | null = null;

export function setAssetBaseUrl(url?: string | null) {
  if (!url) {
    assetBaseUrl = null;
    return;
  }
  assetBaseUrl = String(url).replace(/\/+$/, '');
}

export function getAssetBaseUrl() {
  return assetBaseUrl;
}

export function isOfflineAssets() {
  return assetBaseUrl != null;
}

export function resolveObjectUrl(bucket: string, objectPath: string) {
  if (assetBaseUrl) {
    return `${assetBaseUrl}/${objectPath}`;
  }
  return `${GCS_HOST}/${bucket}/${objectPath}`;
}

export function resolveListUrl(bucket: string, folder: string, pageToken = '') {
  if (assetBaseUrl) {
    return `${assetBaseUrl}/manifests/${folder}.json`;
  }
  let url = `${GCS_HOST}/storage/v1/b/${bucket}/o?prefix=${folder}/`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }
  return url;
}

export function resolveBucketFileUrl(bucketPath: string, fileName: string, useAltMedia = true) {
  const parts = bucketPath.split('/');
  const bucket = parts[0];
  const prefix = parts.slice(1).join('/');
  const objectPath = prefix ? `${prefix}/${fileName}` : fileName;

  if (assetBaseUrl) {
    return `${assetBaseUrl}/${objectPath}`;
  }

  const query = useAltMedia ? '?alt=media&v=3' : '';
  return `${GCS_HOST}/${bucket}/${objectPath}${query}`;
}

export function resolveAssetsRootUrl(isDev: boolean, relativePath: string) {
  if (assetBaseUrl) {
    return `${assetBaseUrl}/${relativePath}`;
  }
  const env = isDev ? 'dev' : 'prod';
  return `${GCS_HOST}/levante-assets-${env}/${relativePath}`;
}
