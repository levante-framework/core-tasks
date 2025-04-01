import { initTimeline, initTrialSaving } from '../shared/helpers';
// setup
import { jsPsych } from '../taskSetup';
import { initializeCat } from '../taskSetup';
// trials
import { enterFullscreen, exitFullscreen, feedback, finishExperiment, taskFinished } from '../shared/trials';
import { getCorsiBlocks } from './trials/stimulus';
import { instructions, readyToPlay, reverseOrderPrompt, reverseOrderInstructions } from './trials/instructions';
import { taskStore } from '../../taskStore';

const generatePracticeTrialTimeline = (reverse: boolean, tryAgainText: string, repetitions: number) => {
  const basicBlock = [
    getCorsiBlocks({ mode: 'display', isPractice: true, reverse }),
    getCorsiBlocks({ mode: 'input', isPractice: true, reverse }),
    feedback(true, 'feedbackCorrect', tryAgainText, true),
  ];

  const finalTimeline = [];
  for (let i = 0; i < repetitions; i += 1) {
    finalTimeline.push(...basicBlock);
  }
  return finalTimeline;
};

const getSecondRoundPracticeTrials = (reverse: boolean, tryAgainText: string) => {
  return ({
    timeline: [
      ...generatePracticeTrialTimeline(reverse, tryAgainText, 2),
      getCorsiBlocks({ mode: 'display', isPractice: true, reverse }),
      getCorsiBlocks({ mode: 'input', isPractice: true, reverse }),
      {
        timeline: [
          feedback(true, 'feedbackCorrect', tryAgainText, true),
        ],
        conditional_function: () => {
          return taskStore().isCorrect
        },
      },
    ],
    conditional_function: () => {
      return !taskStore().isCorrect
    },
  });
};

export default function buildMemoryTimeline(config: Record<string, any>) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);

  const corsiBlocksPractice = {
    timeline: [
      ...generatePracticeTrialTimeline(false, 'memoryGameForwardTryAgain', 3),
    ],
  };

  const corsiBlocksPracticeReverse = {
    timeline: [
      ...generatePracticeTrialTimeline(true, 'memoryGameBackwardTryAgain', 3),
    ],
  };

  const forwardTrial = {
    timeline: [
      getCorsiBlocks({mode: 'display'}),
      getCorsiBlocks({mode: 'input'})
    ],
    conditional_function: () => {
      return (taskStore().numIncorrect < taskStore().maxIncorrect)
    },
  };

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

  const totalRealTrials = corsiBlocksStimulus.repetitions + corsiBlocksReverse.repetitions; 
  taskStore('totalTestTrials', totalRealTrials);

  const timeline: any[] = [
    initialTimeline,
    ...instructions,
    corsiBlocksPractice,
    getSecondRoundPracticeTrials(false, 'memoryGameForwardTryAgain'),
    readyToPlay,
    corsiBlocksStimulus,
    forwardTrialResetSeq,
    reverseOrderInstructions,
    reverseOrderPrompt,
    corsiBlocksPracticeReverse,
    getSecondRoundPracticeTrials(true, 'memoryGameBackwardTryAgain'),
    readyToPlay,
    corsiBlocksReverse,
    taskFinished(),
  ];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
