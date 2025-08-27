import { TASK_BUCKET_NAMES_DEV, TASK_BUCKET_NAMES_PROD } from './constants';

export function getBucketName(
  taskName: string, 
  isDev: boolean, 
  assetType: 'audio' | 'visual' | 'corpus',
  language?: string, 
) {
  const bucket = isDev ? 
    TASK_BUCKET_NAMES_DEV[assetType as keyof typeof TASK_BUCKET_NAMES_DEV] : 
    TASK_BUCKET_NAMES_PROD[assetType as keyof typeof TASK_BUCKET_NAMES_PROD];

  return `${bucket}/${assetType === 'audio' ? language : taskName}`
}
