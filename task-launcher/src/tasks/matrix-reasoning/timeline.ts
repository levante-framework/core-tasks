import 'regenerator-runtime/runtime';
// setup
//@ts-ignore
import { initTrialSaving, initTimeline, createPreloadTrials, taskStore } from '../shared/helpers';
import { instructions } from './trials/instructions';
//@ts-ignore
import { jsPsych, initializeCat, cat } from '../taskSetup';
// trials
//@ts-ignore
import { afcStimulusTemplate, exitFullscreen, setupStimulus, fixationOnly, taskFinished, getAudioResponse } from '../shared/trials';
import { getLayoutConfig } from './helpers/config';
import { repeatInstructionsMessage } from '../shared/trials/repeatInstructions';
import { prepareCorpus, selectNItems } from '../shared/helpers/prepareCat';

export default function buildMatrixTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const stim = taskStore().nextStimulus;
      if (stim.assessmentStage === 'practice_response' || stim.trialType === 'instructions') {
        return false;
      }
      return true;
    },
  };

  const timeline = [preloadTrials, initialTimeline, ...instructions];
  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const translations: Record<string, string> = taskStore().translations;
  const validationErrorMap: Record<string, string> = {}; 
  const { runCat } = taskStore(); 

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

  const stimulusBlock = (config: Record<string, any>) => ({
    timeline: [
      setupStimulus,
      afcStimulusTemplate(config), 
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
  });

  const repeatInstructions = {
    timeline: [
      repeatInstructionsMessage,
      ...instructions
    ],
    conditional_function: () => {
      return taskStore().numIncorrect >= 2; 
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
    for (let i = 0; i < numOfTrials; i += 1) {
      if(i === 4){
        timeline.push(repeatInstructions);
      }
      timeline.push(stimulusBlock(trialConfig)); 
    }
  }

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
