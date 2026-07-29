import { taskStore } from '../../../taskStore';
import { resolveAssetsRootUrl } from './assetBase';

export async function getAssetsPerTask(isDev: boolean) {
  try {
    const response = await fetch(resolveAssetsRootUrl(isDev, 'audio/assets-per-task.json'));

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const assetsPerTask = await response.json();
    taskStore('assetsPerTask', assetsPerTask);
  } catch (error) {
    console.error('Error fetching JSON:', error);
  }
}
