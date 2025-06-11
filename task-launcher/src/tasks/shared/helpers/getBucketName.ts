import { TASK_BUCKET_NAMES_DEV, TASK_BUCKET_NAMES_PROD } from './constants';

export function getBucketName(taskName: string, isDev: boolean) {
  const cleanTaskName = taskName.replace(/-/g, '').toLowerCase();

  if (isDev) {
    return TASK_BUCKET_NAMES_DEV[cleanTaskName as keyof typeof TASK_BUCKET_NAMES_DEV];
  }
  return TASK_BUCKET_NAMES_PROD[cleanTaskName as keyof typeof TASK_BUCKET_NAMES_PROD];
}