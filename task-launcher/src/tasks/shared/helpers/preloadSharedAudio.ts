import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import { createPreloadTrials, filterMedia } from './';

export function preloadSharedAudio() {
  const sharedAudio = filterMedia(mediaAssets, [], taskStore().assetsPerTask.shared.audio, []);

  return createPreloadTrials(sharedAudio).default;
}
