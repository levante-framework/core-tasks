// setup
import 'regenerator-runtime/runtime';
import { jsPsych } from '../taskSetup';
//@ts-ignore
import { initTrialSaving, initTimeline, createPreloadTrials, sdsPhaseCount } from '../shared/helpers';
import { prepareCorpus } from '../shared/helpers/prepareCat';
//@ts-ignore
import { initializeCat } from '../taskSetup';
// trials
//@ts-ignore
import { dataQualityScreen } from '../shared/trials/dataQuality';
// trials
import {
  setupStimulus,
  exitFullscreen,
  taskFinished,
  feedback,
  getAudioResponse,
  enterFullscreen,
  finishExperiment,
} from '../shared/trials';
import { afcMatch } from './trials/afcMatch';
import { stimulus } from './trials/stimulus';
import { taskStore } from '../../taskStore';
import { somethingSameDemo1, somethingSameDemo2, somethingSameDemo3, matchDemo1, matchDemo2 } from './trials/heavyInstructions';


export default function buildSameDifferentTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;
  let feedbackGiven = false;
  const heavy: boolean = taskStore().heavyInstructions; 

  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const preparedCorpus = prepareCorpus(corpus);

  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);

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

  // used for instruction and practice trials
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

  const dataQualityBlock = {
    timeline: [
      dataQualityScreen
    ], 
    conditional_function: () => {
      return taskStore().numIncorrect >= taskStore().maxIncorrect; 
    }
  }

  const timeline = [
    preloadTrials, 
    initialTimeline, 
  ];

  // all instructions + practice trials
  const instructionPractice: StimulusType[] = heavy ? preparedCorpus.ipHeavy : preparedCorpus.ipLight

  // create list of numbers of trials per block
  const blockCountList: number[] = [];
  taskStore().corpora.stimulus.forEach((trial: StimulusType) => {
    blockCountList[Number(trial.blockIndex)] = (blockCountList[Number(trial.blockIndex)]  || 0) + 1;
  })

  // functions to add trials to blocks of each type
  function updateTestDimensions() {
    timeline.push(setupStimulus);
    timeline.push(stimulusBlock);
  }

  function updateSomethingSame() {
    timeline.push(setupStimulus);
    timeline.push(stimulusBlock);
    timeline.push(buttonNoise);
    timeline.push(dataQualityBlock);
  }

  function updateMatching() {
    timeline.push(setupStimulus);
    timeline.push(afcBlock);
    timeline.push(buttonNoise);
    timeline.push(dataQualityBlock); 
  }

  // add to this list with any additional blocks
  const blockOperations = [
    updateTestDimensions, 
    updateSomethingSame, 
    updateMatching, 
    updateTestDimensions, 
    updateMatching, 
    updateMatching
  ]

  // add trials to timeline according to block structure defined in blockOperations
  blockCountList.forEach((count, index) => {
    // push in instructions 
    instructionPractice.filter(trial => (trial.blockIndex == index && trial.trialType == "instructions"))
    .forEach(trial => {
      timeline.push(ipBlock(trial)); 
    });

    // push in any demos for that block
    if (index == 1 && heavy) {
      timeline.push(somethingSameDemo1);
      timeline.push(somethingSameDemo2);
      timeline.push(somethingSameDemo3);
    } 
    if (index == 2 && heavy) {
      timeline.push(matchDemo1);
      timeline.push(matchDemo2);
    }

    // push in practice trials in the corpus
    instructionPractice.filter(trial => (trial.blockIndex == index && trial.assessmentStage == "practice_response"))
    .forEach(trial => {
      timeline.push(ipBlock(trial)); 
    });

    // test trials
    for (let i = 0; i < count; i += 1) {
      blockOperations[index]();
    }
  });

  initializeCat();

  timeline.push(dataQualityScreen);
  timeline.push(taskFinished());
  timeline.push(exitFullscreen);
  return { jsPsych, timeline };
}
