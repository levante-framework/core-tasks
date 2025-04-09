import 'regenerator-runtime/runtime';
// setup
import { jsPsych, initializeCat, cat } from '../taskSetup';
import { createPreloadTrials, initTrialSaving, initTimeline, getRealTrials } from '../shared/helpers';
// trials
import {
  imageInstructions,
  threeDimInstructions,
  videoInstructionsFit,
  videoInstructionsMisfit,
  demo1, 
  demo2,
  encouragement
} from './trials/instructions';
import {
  afcStimulusTemplate,
  taskFinished,
  exitFullscreen,
  setupStimulus,
  fixationOnly,
  getAudioResponse,
  enterFullscreen,
  finishExperiment,
  repeatInstructionsMessage,
  practiceTransition,
} from '../shared/trials';
import { getLayoutConfig } from './helpers/config';
import { prepareCorpus, selectNItems } from '../shared/helpers/prepareCat';
import { taskStore } from '../../taskStore';

export default function buildMentalRotationTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;
  const { runCat, semThreshold, heavyInstructions } = taskStore();
  let playedThreeDimInstructions = false;
  let encouragementCounter = 0; // only used for younger kid version (heavy instructions)

  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const stim = taskStore().nextStimulus;
      if (runCat) {
        // this trial is never used after a practice trial when running in cat
        return true;
      }
      if (stim.assessmentStage === 'practice_response') {
        return false;
      }
      return true;
    },
  };

  const timeline = [
    preloadTrials, 
    initialTimeline, 
    imageInstructions, 
    videoInstructionsMisfit, 
    videoInstructionsFit,
  ];

  if (heavyInstructions) {
    timeline.push(demo1);
  }
  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const translations: Record<string, string> = taskStore().translations;
  const validationErrorMap: Record<string, string> = {};

  const layoutConfigMap: Record<string, LayoutConfigType> = {};
  for (const c of corpus) {
    const { itemConfig, errorMessages } = getLayoutConfig(c, translations, mediaAssets);
    layoutConfigMap[c.itemId] = itemConfig;
    if (errorMessages.length) {
      validationErrorMap[c.itemId] = errorMessages.join('; ');
    }
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
    layoutConfig: {
      showPrompt: true,
    },
    layoutConfigMap,
  };

  // runs with adaptive algorithm if cat enabled
  const stimulusBlock = {
    timeline: [afcStimulusTemplate(trialConfig), ifRealTrialResponse],
    // true = execute normally, false = skip
    conditional_function: () => {
      if (taskStore().skipCurrentTrial) {
        taskStore('skipCurrentTrial', false);
        return false;
      }
      if (runCat && cat._seMeasurement < semThreshold) {
        return false;
      }
      return true;
    },
  };

  const repeatInstructions = {
    timeline: [repeatInstructionsMessage, imageInstructions, videoInstructionsMisfit, videoInstructionsFit],
    conditional_function: () => {
      return taskStore().numIncorrect >= 2;
    },
  };

  const threeDimInstructBlock = {
    timeline: [
      (heavyInstructions ? demo2 : threeDimInstructions)
    ],
    conditional_function: () => {
      if (taskStore().nextStimulus.trialType === '3D' && !playedThreeDimInstructions) {
        playedThreeDimInstructions = true;
        return true;
      }

      return false;
    },
  };

  if (runCat) {
    // seperate out corpus to get cat/non-cat blocks
    const corpora = prepareCorpus(corpus);

    // push in instruction block
    corpora.ipLight.forEach((trial: StimulusType) => {
      timeline.push({ ...fixationOnly, stimulus: '' });
      timeline.push(afcStimulusTemplate(trialConfig, trial));
    });

    // push in practice transition
    timeline.push(practiceTransition);

    // push in starting block
    corpora.start.forEach((trial: StimulusType) => {
      timeline.push({ ...fixationOnly, stimulus: '' });
      timeline.push(afcStimulusTemplate(trialConfig, trial));
      timeline.push(ifRealTrialResponse);
    });

    const numOfCatTrials = corpora.cat.length;
    taskStore('totalTestTrials', numOfCatTrials);
    for (let i = 0; i < numOfCatTrials; i++) {
      if (heavyInstructions) {
        encouragementCounter ++
      }; 

      if (i === 2) {
        timeline.push(repeatInstructions);
      }
      timeline.push({ ...setupStimulus, stimulus: '' });
      timeline.push(threeDimInstructBlock);
      timeline.push(stimulusBlock);

      // add encouragement at variable interval
      if ((encouragementCounter > 5) && Math.random() < 0.25 && heavyInstructions) {
        timeline.push(encouragement); 
        encouragementCounter = 0;
      }
    }

    const unnormedTrials: StimulusType[] = selectNItems(corpora.unnormed, 5);

    const unnormedBlock = {
      timeline: unnormedTrials.map((trial) => afcStimulusTemplate(trialConfig, trial)),
    };

    timeline.push(unnormedBlock);
  } else {
    const numOfTrials = taskStore().totalTrials;
    taskStore('totalTestTrials', getRealTrials(corpus));
    for (let i = 0; i < numOfTrials; i++) {
      if (heavyInstructions) {
        encouragementCounter ++
      };

      if (i === 4) {
        timeline.push(repeatInstructions);
      }
      timeline.push({ ...setupStimulus, stimulus: '' });
      timeline.push(practiceTransition);
      timeline.push(threeDimInstructBlock);
      timeline.push(stimulusBlock);

      if ((encouragementCounter > 4) && Math.random() < 0.3 && heavyInstructions) {
        timeline.push(encouragement); 
        encouragementCounter = 0;
      }
    }
  }

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
