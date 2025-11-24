import { initTimeline, initTrialSaving, createPreloadTrials } from '../shared/helpers';
// setup
import { jsPsych } from '../taskSetup';
import { initializeCat } from '../taskSetup';
// trials
import { enterFullscreen, exitFullscreen, feedback, finishExperiment, taskFinished } from '../shared/trials';
import { getCorsiBlocks } from './trials/stimulus';
import { readyToPlay, reverseOrderPrompt, reverseOrderInstructions, defaultInstructions, downexInstructions } from './trials/instructions';
import { taskStore } from '../../taskStore';
import { mediaAssets } from '../..';

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
  return {
    timeline: [
      ...generatePracticeTrialTimeline(reverse, tryAgainText, 2),
      getCorsiBlocks({ mode: 'display', isPractice: true, reverse }),
      getCorsiBlocks({ mode: 'input', isPractice: true, reverse }),
      {
        timeline: [feedback(true, 'feedbackCorrect', tryAgainText, true)],
        conditional_function: () => {
          return taskStore().isCorrect;
        },
      },
    ],
    conditional_function: () => {
      return !taskStore().isCorrect;
    },
  };
};

export default function buildMemoryTimeline(config: Record<string, any>) {

  const { heavyInstructions } = taskStore();

  initTrialSaving(config);
  const preloadTrials = createPreloadTrials(mediaAssets).default;
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);

  const corsiBlocksPractice = {
    timeline: [...generatePracticeTrialTimeline(false, 'memoryGameForwardTryAgain', 3)],
  };

  const corsiBlocksPracticeReverse = {
    timeline: [...generatePracticeTrialTimeline(true, 'memoryGameBackwardTryAgain', 3)],
  };

  const forwardTrial = {
    timeline: [getCorsiBlocks({ mode: 'display' }), getCorsiBlocks({ mode: 'input' })],
    conditional_function: () => {
      return taskStore().numIncorrect < taskStore().maxIncorrect;
    },
  };

  const corsiBlocksStimulus = {
    timeline: [forwardTrial],
    repetitions: 20,
  };

  // last forward trial by itself in order to reset sequence length back to 2 for backward phase
  const forwardTrialResetSeq = {
    timeline: [getCorsiBlocks({ mode: 'display' }), getCorsiBlocks({ mode: 'input', resetSeq: true })],
    conditional_function: () => {
      const result = taskStore().numIncorrect < taskStore().maxIncorrect;
    
      taskStore('numIncorrect', 0); // reset to 0 here so that reverse block isn't skipped
      
      return result;
    },
  };

  const corsiBlocksReverse = {
    timeline: [getCorsiBlocks({ mode: 'display', reverse: true }), getCorsiBlocks({ mode: 'input', reverse: true })],
    repetitions: 21,
  };

  const totalRealTrials = corsiBlocksStimulus.repetitions + corsiBlocksReverse.repetitions;
  taskStore('totalTestTrials', totalRealTrials);

  const downexFeedbackCorrect = {
    timeline: [
      feedback(true, 'feedbackCorrect', 'memoryGameForwardTryAgain', true),
    ], 
    conditional_function: () => {
      return taskStore().isCorrect;
    },
  }

  const downexFeedbackIncorrect = (reverse: boolean, seqlength: number, prompt: string) => {
    return {
      timeline: [
        getCorsiBlocks(
          { reverse,mode: 'input', isPractice: true, customSeqLength: seqlength, animation: 'pulse', prompt }
        ),
      ], 
      conditional_function: () => {
        return !taskStore().isCorrect;
      },
    }
  }

  const downexPracticeTrial = (
    reverse: boolean, 
    currentSeqlength: number, 
    setNextSeqLength: number, 
    displayPrompt: boolean, 
    preventAutoFinish = false,
    animation?: 'pulse' | 'cursor',
  ) => {
    return {
      timeline: [
        getCorsiBlocks({ reverse, mode: 'display', isPractice: true, customSeqLength: currentSeqlength, displayPrompt, preventAutoFinish }),
        getCorsiBlocks({ reverse, mode: 'input', isPractice: true, customSeqLength: setNextSeqLength, animation }),
        downexFeedbackCorrect,
        downexFeedbackIncorrect(reverse, setNextSeqLength, reverse ? 'memoryGameInstruct11Downex' : 'memoryGameFeedbackIncorrectDownex'),
      ]
    }
  }

  const downexInstructionsTimeline = {
    timeline: [
      downexInstructions[0],
      downexPracticeTrial(false, 1, 1, true, true, 'cursor'),
      downexPracticeTrial(false, 1, 2, true, true),
      downexInstructions[1],
      downexPracticeTrial(false,2, 2, true, false, 'cursor'),
      downexPracticeTrial(false, 2, 2, true),
      downexPracticeTrial(false, 2, 2, true),
      downexInstructions[2],
      downexInstructions[3],
      downexInstructions[4],
    ]
  }

  const downexCorsiBlocksPracticeReverse = {
    timeline: [
      downexPracticeTrial(true, 2, 2, true, false, 'cursor'),
      downexPracticeTrial(true, 2, 2, true),
      downexPracticeTrial(true, 2, 2, true),
    ]
  }

  const defaultCorsiBlocksPracticeReverse = {
    timeline: [
      reverseOrderPrompt, 
      corsiBlocksPracticeReverse, 
      getSecondRoundPracticeTrials(true, 'memoryGameBackwardTryAgain')
    ]
  }

  const defaultInstructionsTimeline = {
    timeline: [
      ...defaultInstructions,
      corsiBlocksPractice,
      getSecondRoundPracticeTrials(false, 'memoryGameForwardTryAgain'),
      readyToPlay,
    ]
  }

  const timeline: any[] = [
    preloadTrials,
    initialTimeline,
    heavyInstructions ? downexInstructionsTimeline : defaultInstructionsTimeline,
    corsiBlocksStimulus,
    forwardTrialResetSeq,
    reverseOrderInstructions,
    heavyInstructions ? downexCorsiBlocksPracticeReverse : defaultCorsiBlocksPracticeReverse,
    readyToPlay,
    corsiBlocksReverse,
    taskFinished(),
  ];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
