import 'regenerator-runtime/runtime';
// setup
import { createPreloadTrials, initTimeline, initTrialSaving } from '../shared/helpers';
// trials
import { enterFullscreen, exitFullscreen, taskFinished } from '../shared/trials';
import { jsPsych } from '../taskSetup';
import { bubblePoppingPractice, buttonPressPractice } from './trials/bubblePopping';
import {
  bubblePoppingInstruction,
  bubblePracticeFeedbackInstruction,
  buttonIntroInstruction,
  firstInstruction,
  remainingInstructions,
} from './trials/instructions';

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
    buttonPressPractice,
    ...remainingInstructions,
  ];

  timeline.push(taskFinished('introFinished'));
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
