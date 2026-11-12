export async function getRequiredAudioNames(isDev: boolean, taskName: string): Promise<string[]> {
  const response = await fetch(
    `https://storage.googleapis.com/levante-assets-${isDev ? 'dev' : 'prod'}/audio/assets-per-task.json`,
  );

  if (!response.ok) {
    throw new Error(`Error fetching assets-per-task.json: ${response.status}`);
  }

  const assetsPerTask = await response.json();
  const taskAudio = assetsPerTask?.[taskName]?.audio;
  const sharedAudio = assetsPerTask?.shared?.audio;
  if (!Array.isArray(taskAudio) || !Array.isArray(sharedAudio)) {
    throw new Error(`No audio list for task ${taskName}`);
  }

  return [...taskAudio, ...sharedAudio];
}
