import 'regenerator-runtime/runtime';
// setup
import { createPreloadTrials, initTimeline, initTrialSaving } from '../shared/helpers';
// trials
import { enterFullscreen, exitFullscreen, taskFinished } from '../shared/trials';
import { jsPsych } from '../taskSetup';
import { instructions } from './trials/instructions';

export default function buildIntroTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen);

  const timeline = [preloadTrials, initialTimeline, ...instructions];

  timeline.push(taskFinished('introFinished'));
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
