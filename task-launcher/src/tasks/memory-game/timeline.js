import { initTimeline, initTrialSaving } from '../shared/helpers';
// setup
import { jsPsych } from '../taskSetup';
import { initializeCat } from '../taskSetup';
// trials
import { instructions, readyToPlay, reverseOrderPrompt } from './trials/instructions';
import { exitFullscreen, feedback } from '../shared/trials';
import { getCorsiBlocks } from './trials/stimulus';

export default function buildMemoryTimeline(config, mediaAssets) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const corsiBlocksPractice = {
    timeline: [
      getCorsiBlocks({ mode: 'display', isPractice: true }),
      getCorsiBlocks({ mode: 'input', isPractice: true }),
      feedback(true),
    ],
    repetitions: 3,
  };

  const corsiBlocksStimulus = {
    timeline: [
      getCorsiBlocks({ mode: 'display' }),
      getCorsiBlocks({ mode: 'input' }),
    ],
    repetitions: 21,
  };

  const corsiBlocksReverse = {
    timeline: [
      getCorsiBlocks({ mode: 'display', reverse: true}),
      getCorsiBlocks({ mode: 'input', reverse: true}),
    ],
    repetitions: 21,
  };

  const timeline = [
    initialTimeline,
    ...instructions,
    corsiBlocksPractice,
    readyToPlay,
    corsiBlocksStimulus,
    reverseOrderPrompt,
    corsiBlocksReverse,
  ];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
