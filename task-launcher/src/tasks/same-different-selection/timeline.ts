import 'regenerator-runtime/runtime';
//@ts-ignore
import { initTrialSaving, initTimeline } from '../shared/helpers';

// setup
//@ts-ignore
import { jsPsych } from '../taskSetup';
//@ts-ignore
import { createPreloadTrials, sdsPhaseCount } from '../shared/helpers';
import { prepareCorpus } from '../shared/helpers/prepareCat';
//@ts-ignore
import { initializeCat } from '../taskSetup';

// trials
//@ts-ignore
import { setupStimulus, exitFullscreen, taskFinished } from '../shared/trials';
import { afcMatch } from './trials/afcMatch';
import { stimulus } from './trials/stimulus';
//@ts-ignore
import { feedback, getAudioResponse } from '../shared/trials';
import { taskStore } from '../../taskStore';


export default function buildSameDifferentTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;
  let feedbackGiven = false;
  const heavy: boolean = taskStore().heavyInstructions; 

  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const preparedCorpus = prepareCorpus(corpus); 
  console.log(taskStore().corpora.stimulus);

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const buttonNoise = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const trialType = taskStore().nextStimulus.trialType;
      const assessmentStage = taskStore().nextStimulus.assessmentStage; 

      if ((trialType === 'something-same-2' || trialType.includes('match')) && (assessmentStage != 'practice_response')) {
        return true;
      }
      return false;
    },
  };

  const ipBlock = (trial: StimulusType) => {
    return {
      timeline: [
        stimulus(trial)
      ]
    }
  };

  const stimulusBlock = {
    timeline: [
      stimulus()
    ],
  };
  
  const feedbackBlock = {
    timeline: [
      feedback(true, 'feedbackCorrect', 'feedbackTryAgain')
    ],
  
    conditional_function: () => {
      if (!feedbackGiven){
        feedbackGiven = true; 
        return true
      }
      return false
    }
  };
  
  const afcBlock = {
    timeline: [
      afcMatch
    ],
  };

  const timeline = [
    preloadTrials, 
    initialTimeline, 
  ];

  let block1 = 0, block2 = 0, block3 = 0, block4 = 0, block5 = 0, block6 = 0;

  taskStore().corpora.stimulus.forEach((trial: StimulusType) => {
    switch (trial.blockIndex) {
      case 1: 
        block1 += 1; 
        break;
      case 2: 
        block2 += 1;
        break;
      case 3: 
        block3 += 1;
        break;
      case 4: 
        block4 += 1;
        break;
      case 5: 
        block5 += 1;
        break;
      case 6: 
        block6 += 1;
        break;
    }
  })

  const instructionPractice: StimulusType[] = heavy ? preparedCorpus.ipHeavy : preparedCorpus.ipLight

  instructionPractice.filter(trial => trial.blockIndex == 0).forEach(trial => {
    timeline.push(ipBlock(trial))
  });

  // test dimensions
  for (let i = 0; i < block1; i++) {
    timeline.push(setupStimulus)
    timeline.push(stimulusBlock)
    timeline.push(buttonNoise) // adds button noise for appropriate trials
  }

  instructionPractice.filter(trial => trial.blockIndex == 2).forEach(trial => {
    timeline.push(ipBlock(trial))
  });

  // something-same
  for (let i = 0; i < block2; i++) {
    timeline.push(setupStimulus)
    timeline.push(stimulusBlock)
    timeline.push(buttonNoise) // adds button noise for appropriate trials
    //timeline.push(feedbackBlock)
  }

  // 2-match
  for (let i = 0; i < block3; i++) { 
    timeline.push(setupStimulus)
    timeline.push(afcBlock)
    timeline.push(buttonNoise)
  }

  instructionPractice.filter(trial => trial.blockIndex == 4).forEach(trial => {
    timeline.push(ipBlock(trial))
  });

  // test-dimensions
  for (let i = 0; i < block4; i++) {
    timeline.push(setupStimulus)
    timeline.push(stimulusBlock) 
  }

  // 3-match
  for (let i = 0; i < block5; i++) { 
    timeline.push(setupStimulus)
    timeline.push(afcBlock)
    timeline.push(buttonNoise)
  }

  // 4-match
  for (let i = 0; i < block6; i++) {
    timeline.push(setupStimulus)
    timeline.push(afcBlock)
    timeline.push(buttonNoise) 
  }


  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);
  return { jsPsych, timeline };
}
