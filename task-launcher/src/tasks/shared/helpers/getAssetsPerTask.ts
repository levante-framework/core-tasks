import { taskStore } from '../../../taskStore';
import { Logger } from '../../../utils/logger';

export async function getAssetsPerTask(isDev: boolean) {
  try {
    const response = await fetch(
      `https://storage.googleapis.com/levante-assets-${isDev ? 'dev' : 'prod'}/audio/assets-per-task.json`,
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const assetsPerTask = await response.json();
    taskStore('assetsPerTask', assetsPerTask);
  } catch (error) {
    Logger.getInstance().error(error, { source: 'getAssetsPerTask' });
  }
}
