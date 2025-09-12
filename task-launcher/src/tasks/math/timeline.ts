import 'regenerator-runtime/runtime';
import store from 'store2';
// setup
import {
  initTrialSaving,
  initTimeline,
  createPreloadTrials,
  prepareCorpus,
  prepareMultiBlockCat,
  getRealTrials,
} from '../shared/helpers';
import { jsPsych, initializeCat } from '../taskSetup';
import { slider } from './trials/sliderStimulus';
import {
  afcStimulusTemplate,
  enterFullscreen,
  exitFullscreen,
  finishExperiment,
  getAudioResponse,
  setupStimulus,
  fixationOnly,
  setupStimulusFromBlock,
  taskFinished,
  practiceTransition,
  feedback,
} from '../shared/trials';
import { getLayoutConfig } from './helpers/config';
import { taskStore } from '../../taskStore';

export default function buildMathTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);

  const ifRealTrialResponse = (trial?: StimulusType) => {
    return {
      timeline: [getAudioResponse(mediaAssets)],

      conditional_function: () => {
        const stim = trial || taskStore().nextStimulus;
        if (stim.assessmentStage === 'practice_response' || stim.trialType === 'instructions') {
          return false;
        }

        const trialsSkipped = taskStore().trialsSkipped;
        if (trialsSkipped > 0) {
          return false;
        }

        return true;
      },
    };
  };

  const timeline = [preloadTrials, initialTimeline];

  let corpus: StimulusType[] = taskStore().corpora.stimulus;
  const translations: Record<string, string> = taskStore().translations;
  const validationErrorMap: Record<string, string> = {};

  const { runCat, heavyInstructions } = taskStore();

  // block 3 is only for younger kids
  if (!runCat) {
    corpus = corpus.filter((trial) => {
      return heavyInstructions ? trial.block_index === '3' : trial.block_index !== '3';
    });
  }

  taskStore('totalTrials', corpus.length);

  const layoutConfigMap: Record<string, LayoutConfigType> = {};
  let i = 0;
  for (const c of corpus) {
    const { itemConfig, errorMessages } = getLayoutConfig(c, translations, mediaAssets, i);
    layoutConfigMap[c.itemId] = itemConfig;
    if (errorMessages.length) {
      validationErrorMap[c.itemId] = errorMessages.join('; ');
    }
    i += 1;
  }

  if (Object.keys(validationErrorMap).length) {
    console.error('The following errors were found');
    console.table(validationErrorMap);
    throw new Error('Something went wrong. Please look in the console for error details');
  }

  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
    layoutConfigMap,
  };

  const feedbackBlock = (trial?: StimulusType) => {
    return {
      timeline: [feedback(true, 'feedbackCorrect', 'feedbackNotQuiteRight', false)],
      conditional_function: () => {
        if (!trial) {
          return (
            taskStore().nextStimulus.assessmentStage === 'practice_response' &&
            taskStore().nextStimulus.trialType === 'Number Line Slider'
          );
        } else {
          return trial.trialType === 'Number Line Slider';
        }
      },
    };
  };

  const setupBlock = {
    timeline: [{ ...setupStimulus, stimulus: '' }],
    conditional_function: () => {
      const trialsSkipped = taskStore().trialsSkipped;

      if (trialsSkipped > 0) {
        taskStore('trialsSkipped', trialsSkipped - 1);
        taskStore.transact('testTrialCount', (oldVal: number) => oldVal + 1);
        return false;
      } else {
        return true;
      }
    },
  };

  const interBlockGap = {
    timeline: [{ ...fixationOnly, stimulus: '', post_trial_gap: 350 }],
    conditional_function: () => {
      return taskStore().trialsSkipped === 1;
    },
  };

  const afcStimulusBlock = (trial?: StimulusType) => {
    return {
      timeline: [afcStimulusTemplate(trialConfig, trial)],
      conditional_function: () => {
        const trialsSkipped = taskStore().trialsSkipped;
        if (trialsSkipped > 0) {
          return false;
        }

        return !(trial || taskStore().nextStimulus).trialType?.includes('Number Line');
      },
    };
  };

  const sliderBlock = (trial?: StimulusType) => {
    return {
      timeline: [slider(layoutConfigMap, trial), feedbackBlock(trial)],
      conditional_function: () => {
        const trialsSkipped = taskStore().trialsSkipped;

        if (trialsSkipped > 0) {
          return false;
        }

        return (trial || taskStore().nextStimulus).trialType?.includes('Number Line');
      },
    };
  };

  const sliderPractice: StimulusType[] = corpus.filter((trial) => {
    return trial.trialType === 'Number Line Slider' && trial.assessmentStage === 'practice_response';
  });

  // this block repeats all slider practice trials
  const repeatSliderPracticeBlock = () => {
    let trials: any[] = [];
    sliderPractice.forEach((trial, index) => {
      trials.push(slider(layoutConfigMap, trial));
      if (index < sliderPractice.length - 1) {
        trials.push({
          ...feedback(true, 'feedbackCorrect', 'feedbackNotQuiteRight'),
          conditional_function: () => {
            return true;
          },
          post_trial_gap: 350,
        });
      }
    });

    return {
      timeline: [...trials],
      conditional_function: () => {
        return (
          !taskStore().isCorrect &&
          !taskStore().testPhase &&
          (taskStore().nextStimulus.trialType === 'Number Line Slider' || runCat) &&
          taskStore().nextStimulus.assessmentStage === 'test_response'
        );
      },
    };
  };

  const stimulusBlock = (trial?: StimulusType) => {
    return {
      timeline: [afcStimulusBlock(trial), sliderBlock(trial), ifRealTrialResponse(trial)],
      conditional_function: () => {
        if (taskStore().skipCurrentTrial) {
          taskStore('skipCurrentTrial', false);
          return false;
        }
        const stim = trial || taskStore().nextStimulus;
        const skipBlockTrialType = store.page.get('skipCurrentBlock');
        if (stim.trialType === skipBlockTrialType && !runCat) {
          return false;
        } else {
          return true;
        }
      },
    };
  };

  if (runCat) {
    // puts the CAT portion of the corpus into taskStore and removes instructions
    const fullCorpus = prepareCorpus(corpus);
    // until younger-kid version of math is implemented, combine heavy/light instructions
    const allInstructionPractice = fullCorpus.ipLight.concat(fullCorpus.ipHeavy);
    const instructions = allInstructionPractice.filter((trial) => trial.trialType == 'instructions');
    const practice = allInstructionPractice.filter((trial) => trial.assessmentStage == 'practice_response');

    let allBlocks: StimulusType[][] = prepareMultiBlockCat(taskStore().corpora.stimulus);
    const downexBlock = allBlocks[3]; 
    // move downex block to the beginning
    allBlocks = [downexBlock, ...allBlocks.slice(0,3)];
    
    const newCorpora = {
      practice: taskStore().corpora.practice,
      stimulus: allBlocks,
    };
    taskStore('corpora', newCorpora); // puts all blocks into taskStore
    console.log(taskStore().corpora.stimulus);
    taskStore('totalTestTrials', 0); // add to this while building out each block

    const numOfBlocks = allBlocks.length;
    const trialProportionsPerBlock = [2, 2, 3, 3]; // divide by these numbers to get trials per block
    for (let i = (heavyInstructions ? 0 : 1); i < numOfBlocks; i++) { // skip first block if not heavyInstructions
      // push in block-specific instructions
      let usedIDs: string[] = [];
      const blockInstructions = instructions.filter((trial) => {
        const trialBlock = trial.block_index === "3" ? 0 : Number(trial.block_index) + 1; 
        let allowedIDs: string[]; // CAT only uses particular instructions from corpus

        switch (i) {
          case 0:
            allowedIDs = ['math-instructions1-heavy'];
            break;
          case 1:
            allowedIDs = heavyInstructions ? ['math-intro2'] : ['math-instructions1', 'math-intro1'];
            break;
          case 2:
            allowedIDs = ['math-intro2'];
            break;
          case 3:
            allowedIDs = ['math-intro2', 'number-line-instruct1'];
            break;
          default:
            allowedIDs = [];
        }

        const include =
          trialBlock === i && allowedIDs.includes(trial.itemId) && !usedIDs.includes(trial.itemId);

        if (include) {
          usedIDs.push(trial.itemId);
        }

        return include;
      });

      blockInstructions.forEach((trial) => {
        timeline.push({ ...fixationOnly, stimulus: '' });
        timeline.push(afcStimulusTemplate(trialConfig, trial));
      });

      // push in block-specific practice trials
      const blockPractice = practice.filter((trial) => {
        const trialBlock = trial.block_index === "3" ? 0 : Number(trial.block_index) + 1;
        return trialBlock === i;
      });
      blockPractice.forEach((trial) => {
        timeline.push({ ...fixationOnly, stimulus: '' });
        timeline.push(stimulusBlock(trial));

        if (trial.trialType === 'Number Line Slider') {
          timeline.push(feedbackBlock());
        }
      });

      // final slider block
      if (i === 3) {
        timeline.push(repeatSliderPracticeBlock());
      }

      // practice transition screen
      timeline.push(practiceTransition);

      // push in random items at start of first block (after practice trials)
      if (i === 1) {
        fullCorpus.start.forEach((trial) => timeline.push(stimulusBlock(trial)));
      }

      const numOfTrials = allBlocks[i].length / trialProportionsPerBlock[i];
      taskStore.transact('numOfTrials', (oldVal: number) => (oldVal += numOfTrials));
      for (let j = 0; j < numOfTrials; j++) {
        timeline.push({ ...setupStimulusFromBlock(i), stimulus: '' }); // select only from the current block
        timeline.push(stimulusBlock());
      }

      fullCorpus.unnormed.forEach((trial) => {
        timeline.push({ ...fixationOnly, stimulus: '' });
        timeline.push(stimulusBlock(trial));
      });
    }
  } else {
    taskStore('totalTestTrials', getRealTrials(corpus));

    // if cat is not running, remove difficulty field from all items
    corpus.forEach((trial) => (trial.difficulty = NaN));

    const newCorpora = {
      practice: taskStore().corpora.practice,
      stimulus: corpus,
    };
    taskStore('corpora', newCorpora);

    const numOfTrials = taskStore().totalTrials;
    for (let i = 0; i < numOfTrials; i++) {
      timeline.push(setupBlock);
      timeline.push(repeatSliderPracticeBlock());
      timeline.push(practiceTransition);
      timeline.push(interBlockGap);
      timeline.push(stimulusBlock());
    }
  }

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
