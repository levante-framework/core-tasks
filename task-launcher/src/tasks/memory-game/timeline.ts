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
import { instructions, readyToPlay, reverseOrderPrompt, reverseOrderInstructions } from './trials/instructions';
import { taskStore } from '../../taskStore';

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

  const corsiBlocksPracticeReverse = {
    timeline: [
      getCorsiBlocks({ mode: 'display', isPractice: true, reverse: true }),
      getCorsiBlocks({ mode: 'input', isPractice: true, reverse: true }),
      feedback(true, 'feedbackCorrect', 'memoryGameBackwardTryAgain'),
    ],
    repetitions: 3,
  };

  const forwardTrial = {
    timeline: [
      getCorsiBlocks({mode: 'display'}),
      getCorsiBlocks({mode: 'input'})
    ],
    conditional_function: () => {
      return (taskStore().numIncorrect < taskStore().maxIncorrect)
    },
  }

  const corsiBlocksStimulus = {
    timeline: [
      forwardTrial
    ],
    repetitions: 20,
  };

  // last forward trial by itself in order to reset sequence length back to 2 for backward phase
  const forwardTrialResetSeq = {
    timeline: [
      getCorsiBlocks({mode: 'display'}),
      getCorsiBlocks({mode: 'input', resetSeq: true})
    ],
    conditional_function: () => {
      return (taskStore().numIncorrect < taskStore().maxIncorrect)
    }
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
    forwardTrialResetSeq,
    reverseOrderInstructions,
    reverseOrderPrompt,
    corsiBlocksPracticeReverse,
    readyToPlay,
    corsiBlocksReverse,
  ];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
