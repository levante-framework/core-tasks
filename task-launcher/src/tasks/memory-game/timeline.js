import { initTimeline, initTrialSaving, taskStore } from '../shared/helpers';
// setup
import { jsPsych } from '../taskSetup';
import { initializeCat } from '../taskSetup';
// trials
import { instructions, readyToPlay, reverseOrderPrompt } from './trials/instructions';
import { exitFullscreen, feedback, taskFinished } from '../shared/trials';
import { getCorsiBlocks } from './trials/stimulus';

function checkContinue(){
  const maxIncorrect = taskStore().maxIncorrect; 
  const numIncorrect = taskStore().numIncorrect;

  return numIncorrect < maxIncorrect; 
}

export default function buildMemoryTimeline(config, mediaAssets) {
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

    conditional_function: () => {
      return checkContinue(); 
    }
  };

  // last forward trial by itself in order to reset sequence length back to 2 for backward phase
  const lastForwardTrial = {
    timeline: [
      getCorsiBlocks({mode: 'display'}),
      getCorsiBlocks({mode: 'input', resetSeq: true})
    ], 

    conditional_function: () => {
      return checkContinue(); 
    }
  }

  const conditionalReversePrompt = {
    timeline: [reverseOrderPrompt], 

    conditional_function: () => {
      return checkContinue(); 
    }
  }

  const corsiBlocksReverse = {
    timeline: [
      getCorsiBlocks({ mode: 'display', reverse: true}),
      getCorsiBlocks({ mode: 'input', reverse: true}),
    ],

    conditional_function: () => {
      return checkContinue(); 
    }
  };

  const timeline = [
    initialTimeline,
    ...instructions,
    corsiBlocksPractice,
    readyToPlay
  ];

  for (let i = 0; i < 20; i++){
    timeline.push(corsiBlocksStimulus); 
  }

  timeline.push(lastForwardTrial); 
  timeline.push(conditionalReversePrompt); 

  for (let i = 0; i < 21; i++){
    timeline.push(corsiBlocksReverse); 
  }

  initializeCat();

  timeline.push(taskFinished); 
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
