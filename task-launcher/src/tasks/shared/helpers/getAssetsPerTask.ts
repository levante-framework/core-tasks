import { taskStore } from "../../../taskStore";

export async function getAssetsPerTask() {
  try {
    const response = await fetch('https://storage.googleapis.com/levante-assets-dev/audio/assets-per-task.json');

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const assetsPerTask = await response.json();
    taskStore('assetsPerTask', assetsPerTask)
  } catch (error) {
    console.error('Error fetching JSON:', error);
  }
}
