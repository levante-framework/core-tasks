import 'regenerator-runtime/runtime';
// setup
import { initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';
import { firstInstruction, bubblePoppingInstruction, bubblePracticeFeedbackInstruction, buttonIntroInstruction, remainingInstructions } from './trials/instructions';
import { jsPsych } from '../taskSetup';
// trials
import { enterFullscreen, exitFullscreen, taskFinished } from '../shared/trials';
import { bubblePoppingPractice } from './trials/bubblePopping';

export default function buildIntroTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen);

  const timeline = [
    preloadTrials, 
    initialTimeline, 
    firstInstruction, 
    bubblePoppingInstruction,
    bubblePoppingPractice,
    bubblePracticeFeedbackInstruction,
    buttonIntroInstruction,
    ...remainingInstructions,
  ];

  timeline.push(taskFinished('introFinished'));
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
