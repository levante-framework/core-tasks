import 'regenerator-runtime/runtime';
// setup
// @ts-ignore
import { jsPsych, initializeCat } from '../taskSetup';
// @ts-ignore
import { createPreloadTrials, taskStore, initTrialSaving, initTimeline } from '../shared/helpers';
// trials
// @ts-ignore
import { afcStimulusTemplate, taskFinished, exitFullscreen, setupStimulus, fixationOnly, getAudioResponse } from '../shared/trials';
import { imageInstructions, videoInstructionsFit, videoInstructionsMisfit } from './trials/instructions';
import { getLayoutConfig } from './helpers/config';
import { repeatInstructionsMessage } from '../shared/trials/repeatInstructions';
import { prepareCorpus } from '../shared/helpers/prepareCat';

export default function buildMentalRotationTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const stim = taskStore().nextStimulus;
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

  // seperate out corpus to get cat/non-cat blocks
  const corpora = prepareCorpus(corpus); 

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
  
  corpora.instructionPractice.forEach((trial: StimulusType) => {
    timeline.push(fixationOnly); 
    timeline.push(afcStimulusTemplate(trialConfig, trial)); 
  });

  const stimulusBlock = {
    timeline: [
      afcStimulusTemplate(trialConfig), 
      ifRealTrialResponse
    ],
    // true = execute normally, false = skip
    conditional_function: () => {
      if (taskStore().skipCurrentTrial) {
        taskStore('skipCurrentTrial', false);
        return false;
      } else {
        return true;
      }
    },
  };

  const numOfCatTrials = corpora.cat.length;
  for (let i = 0; i < numOfCatTrials; i++) {
    if(i === 2){
      timeline.push(repeatInstructions)
    }
    timeline.push(setupStimulus);
    timeline.push(stimulusBlock);
  }

  const unnormedBlock = {
    timeline: corpora.unnormed.map((trial) => afcStimulusTemplate(trialConfig, trial)), 
    randomize_order: true
  }
  
  timeline.push(unnormedBlock);

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
