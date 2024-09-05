import 'regenerator-runtime/runtime';
// setup
// @ts-ignore
import { initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';
import { instructions } from './trials/instructions';
// @ts-ignore
import { jsPsych } from '../taskSetup';
// trials
// @ts-ignore
import { exitFullscreen, taskFinished } from '../shared/trials';

export default function buildIntroTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const timeline = [preloadTrials, initialTimeline, ...instructions];

  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
