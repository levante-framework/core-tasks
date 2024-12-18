//@ts-ignore
import { initTimeline, initTrialSaving } from '../shared/helpers';
// setup
//@ts-ignore
import { jsPsych } from '../taskSetup';
//@ts-ignore
import { initializeCat } from '../taskSetup';
// trials
//@ts-ignore
import { exitFullscreen, feedback } from '../shared/trials';
import { getCorsiBlocks } from './trials/stimulus';
import { instructions, readyToPlay, reverseOrderPrompt } from './trials/instructions';

export default function buildMemoryTimeline(config: Record<string, any>) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const corsiBlocksPractice = {
    timeline: [
      getCorsiBlocks({ mode: 'display', isPractice: true }),
      getCorsiBlocks({ mode: 'input', isPractice: true }),
      feedback(true, 'feedbackCorrect', 'memoryGameForwardTryAgain'),
    ],
    repetitions: 3,
  };

  const corsiBlocksStimulus = {
    timeline: [
      getCorsiBlocks({ mode: 'display' }),
      getCorsiBlocks({ mode: 'input' }),
    ],
    repetitions: 20,
  };

  // last forward trial by itself in order to reset sequence length back to 2 for backward phase
  const lastForwardTrial = {
    timeline: [
      getCorsiBlocks({mode: 'display'}),
      getCorsiBlocks({mode: 'input', resetSeq: true})
    ]
  }

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
    lastForwardTrial,
    reverseOrderPrompt,
    corsiBlocksReverse,
  ];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
