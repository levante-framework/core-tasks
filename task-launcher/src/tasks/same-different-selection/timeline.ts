// setup
import 'regenerator-runtime/runtime';
import { jsPsych } from '../taskSetup';
import { initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';
import { prepareCorpus, prepareMultiBlockCat } from '../shared/helpers/prepareCat';
import { initializeCat } from '../taskSetup';
// trials
import { dataQualityScreen } from '../shared/trials/dataQuality';
import {
  setupStimulus,
  fixationOnly,
  exitFullscreen,
  taskFinished,
  feedback,
  getAudioResponse,
  enterFullscreen,
  finishExperiment,
  setupStimulusFromBlock,
} from '../shared/trials';
import { afcMatch } from './trials/afcMatch';
import { stimulus } from './trials/stimulus';
import { taskStore } from '../../taskStore';
import {
  somethingSameDemo1,
  somethingSameDemo2,
  somethingSameDemo3,
  matchDemo1,
  matchDemo2,
} from './trials/heavyInstructions';

export default function buildSameDifferentTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;
  let feedbackGiven = false;
  const heavy: boolean = taskStore().heavyInstructions; 
  const cat: boolean = taskStore().runCat;

  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const preparedCorpus = prepareCorpus(corpus);

  if (cat) {
    const allBlocks = prepareMultiBlockCat(taskStore().corpora.stimulus); 
        
      const newCorpora = {
        practice: taskStore().corpora.practice,
        stimulus: allBlocks
      }
      taskStore('corpora', newCorpora); // puts all blocks into taskStore
  }

  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);

  const buttonNoise = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const trialType = taskStore().nextStimulus.trialType;
      const assessmentStage = taskStore().nextStimulus.assessmentStage;

      if ((trialType === 'something-same-2' || trialType.includes('match')) && assessmentStage != 'practice_response') {
        return true;
      }
      return false;
    },
  };

  // used for instruction and practice trials
  const ipBlock = (trial: StimulusType) => {
    return {
      timeline: [{ ...fixationOnly, stimulus: '' }, stimulus(trial)],
    };
  };

  const stimulusBlock = {
    timeline: [stimulus()],
  };

  const feedbackBlock = {
    timeline: [feedback(true, 'feedbackCorrect', 'feedbackTryAgain')],

    conditional_function: () => {
      if (!feedbackGiven) {
        feedbackGiven = true;
        return true;
      }
      return false;
    },
  };

  const afcBlock = {
    timeline: [afcMatch],
  };

  const dataQualityBlock = {
    timeline: [dataQualityScreen],
    conditional_function: () => {
      return taskStore().numIncorrect >= taskStore().maxIncorrect && heavy;
    },
  };

  const timeline = [preloadTrials, initialTimeline];

  // all instructions + practice trials
  const instructionPractice: StimulusType[] = heavy ? preparedCorpus.ipHeavy : preparedCorpus.ipLight;

  // returns practice + instruction trials for a given block
  function getPracticeInstructions(blockNum: number): StimulusType[] {
    return instructionPractice.filter((trial) => trial.blockIndex == blockNum);
  }

  // create list of numbers of trials per block
  const blockCountList: number[] = [];
  let testDimPhase2: boolean = false;

  cat ? 
  taskStore().corpora.stimulus.forEach((block: StimulusType[]) => {
    blockCountList.push(block.length); 
  }) :
  taskStore().corpora.stimulus.forEach((trial: StimulusType) => {
    // if not running a CAT, trials are blocked by their type 
    let trialBlock: number; 
    switch (trial.trialType) {
      case "test-dimensions":
          trialBlock = testDimPhase2 ? 3 : 0; 
        break;
      case "something-same-1":
        testDimPhase2 = true; 
        trialBlock = 1; 
        break; 
      case "something-same-2":
        trialBlock = 1; 
        break;
      case "2-match": 
        trialBlock = 2; 
        break; 
      case "3-match":
        trialBlock = 4; 
        break; 
      case "4-match":
        trialBlock = 5;
        break;
      default:
        trialBlock = NaN;
        break;
    }

    if (!Number.isNaN(trialBlock)) {
      blockCountList[trialBlock] = (blockCountList[trialBlock] || 0) + 1; 
    }
  });

  const totalRealTrials = blockCountList.reduce((acc, total) => acc + total, 0);
  taskStore('totalTestTrials', totalRealTrials);

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
    updateMatching,
  ];

  // add trials to timeline according to block structure defined in blockOperations
  blockCountList.forEach((count, index) => {
    const currentBlockInstructionPractice = getPracticeInstructions(index);

    // push in instruction + practice trials
    if (index === 1 && heavy) {
      // something's the same block has demo trials in between instructions
      const firstInstruction = currentBlockInstructionPractice.shift();
      if (firstInstruction != undefined) {
        timeline.push(ipBlock(firstInstruction));
      }

      timeline.push(somethingSameDemo1);
      timeline.push(somethingSameDemo2);
      timeline.push(somethingSameDemo3);
    }

    currentBlockInstructionPractice.forEach((trial) => {
      timeline.push(ipBlock(trial));
    });

    if (index === 2 && heavy) {
      // 2-match has demo trials after instructions
      timeline.push(matchDemo1);
      timeline.push(matchDemo2);
    }

    // push in test trials
    if (cat) {
      // returns timeline object containing the appropriate trials - only runs if they match what is in taskStore
      function runCatTrials(trialNum: number, trialType: 'stimulus' | 'afc') {
        const timeline = []; 
        for (let i = 0; i < trialNum; i++) {
          if (trialType === 'stimulus') {
            timeline.push(stimulus());
          } else {
            timeline.push(afcMatch); 
          }

          if (i < trialNum - 1) {
            timeline.push({...fixationOnly, stimulus: ''});
          }
        }

        return {
          timeline: timeline, 
          conditional_function: () => {
            const stimulus = taskStore().nextStimulus;

            if (trialType === 'stimulus') {
              return (
                (stimulus.trialType === "test-dimensions" && trialNum === 1) ||
                (stimulus.trialType.includes("something-same") && trialNum === 2)
              );
            } else {
               return (stimulus.trialType === trialNum + "-match");
            }
          }
        }
      }
    
      const numOfTrials = (index === 0) ? count : count / 2; // change this based on simulation results?
      for (let i = 0; i < numOfTrials; i++) {
        timeline.push({...setupStimulusFromBlock(index), stimulus: ''});

        if (index === 0) {
          timeline.push(runCatTrials(1, "stimulus"));
        } 
        if (index === 1) {
          timeline.push(runCatTrials(2, "stimulus"));
        }
        if (index === 2) {
          timeline.push(runCatTrials(2, "afc"));
          timeline.push(runCatTrials(3, "afc"));
          timeline.push(runCatTrials(4, "afc"));
        }
      }
    } else {
      for (let i = 0; i < count; i += 1) {
        blockOperations[index]();
      }
    }
  });

  initializeCat();

  if (heavy) {
    timeline.push(dataQualityScreen);
  }
  timeline.push(taskFinished());
  timeline.push(exitFullscreen);
  return { jsPsych, timeline };
}
