import 'regenerator-runtime/runtime';
// setup
// @ts-ignore
import { jsPsych, initializeCat, cat } from '../taskSetup';
// @ts-ignore
import { createPreloadTrials, initTrialSaving, initTimeline } from '../shared/helpers';
// trials
// @ts-ignore
import { afcStimulusTemplate, taskFinished, exitFullscreen, setupStimulus, fixationOnly, getAudioResponse } from '../shared/trials';
import { imageInstructions, videoInstructionsFit, videoInstructionsMisfit } from './trials/instructions';
import { getLayoutConfig } from './helpers/config';
import { repeatInstructionsMessage } from '../shared/trials/repeatInstructions';
import { prepareCorpus, selectNItems } from '../shared/helpers/prepareCat';
import { taskStore } from '../../taskStore';

export default function buildMentalRotationTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;
  const { runCat } = taskStore();
  const { semThreshold } = taskStore();

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const stim = taskStore().nextStimulus;
      if (runCat) { // this trial is never used after a practice trial when running in cat
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
      showPrompt: true
    },
    layoutConfigMap,
  };

  // runs with adaptive algorithm if cat enabled
  const stimulusBlock = {
    timeline: [
      setupStimulus,
      afcStimulusTemplate(trialConfig), 
      ifRealTrialResponse
    ],
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
    timeline: [
      repeatInstructionsMessage,
      imageInstructions,
      videoInstructionsMisfit,
      videoInstructionsFit,
    ], 
    conditional_function: () => {
      return taskStore().numIncorrect >= 2
    }
  }; 

  if (runCat) {
    // seperate out corpus to get cat/non-cat blocks
    const corpora = prepareCorpus(corpus); 

    // push in instruction block
    corpora.instructionPractice.forEach((trial: StimulusType) => {
      timeline.push(fixationOnly); 
      timeline.push(afcStimulusTemplate(trialConfig, trial)); 
    });

    // push in starting block
    corpora.start.forEach((trial: StimulusType) => {
      timeline.push(fixationOnly); 
      timeline.push(afcStimulusTemplate(trialConfig, trial));
      timeline.push(ifRealTrialResponse); 
    });

    const numOfCatTrials = corpora.cat.length;
    for (let i = 0; i < numOfCatTrials; i++) {
      if (i === 2) {
        timeline.push(repeatInstructions)
      }
      timeline.push(stimulusBlock);
    }

    const unnormedTrials: StimulusType[] = selectNItems(corpora.unnormed, 5); 
  
    const unnormedBlock = {
      timeline: unnormedTrials.map((trial) => afcStimulusTemplate(trialConfig, trial))
    }
  
    timeline.push(unnormedBlock);
  } else {
    const numOfTrials = taskStore().totalTrials; 
    for (let i = 0; i < numOfTrials; i++) {
      if (i === 4) {
        timeline.push(repeatInstructions)
      }
      timeline.push(stimulusBlock);
    }
  }

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
