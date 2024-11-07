import 'regenerator-runtime/runtime';
// setup
//@ts-ignore
import { initTrialSaving, initTimeline, createPreloadTrials, taskStore } from '../shared/helpers';
import { instructions } from './trials/instructions';
//@ts-ignore
import { jsPsych, initializeCat } from '../taskSetup';
// trials
//@ts-ignore
import { exitFullscreen, setupStimulus, taskFinished, getAudioResponse } from '../shared/trials';
//@ts-ignore
import {AfcStimulusInput, afcStimulusInference } from './trials/afcInference';
import { getLayoutConfig } from './helpers/config';
import { repeatInstructionsMessage } from '../shared/trials/repeatInstructions';

export default function buildRoarInferenceTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
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
  console.log('corpus', corpus);
  const translations: Record<string, string> = taskStore().translations;
  const validationErrorMap: Record<string, string> = {}; 
  const layoutConfigMap: Record<string, LayoutConfigType> = {};

  let i = 0;
  for (const c of corpus) {
    const { itemConfig, errorMessages } = getLayoutConfig(c, translations, mediaAssets, i);
    layoutConfigMap[c.itemId] = itemConfig;
    layoutConfigMap[c.itemId].story = c.story;
    layoutConfigMap[c.itemId].storyId = c.storyId;
    if (errorMessages.length) {
      validationErrorMap[c.itemId] = errorMessages.join('; ');
    }
    i += 1;
  }

  const trialConfig:AfcStimulusInput = {
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
    layoutConfigMap,
  };

  const stimulusBlock = (config: AfcStimulusInput) => ({
    timeline: [
      afcStimulusInference(config) 
    ],
  });

  const repeatInstructions = {
    timeline: [
      repeatInstructionsMessage,
    ],
    conditional_function: () => {
      return taskStore().numIncorrect >= 2; 
    }
  }; 

  const instructionsRepeated = {
    timeline: instructions,
    conditional_function: () => {
      return taskStore().numIncorrect >= 2; 
    }
  }

  const inferenceNumStories = taskStore().inferenceNumStories;

  const numOfTrials = inferenceNumStories ?? taskStore().totalTrials;

  for (let i = 0; i < numOfTrials; i += 1) {
    if(i === 4){
      timeline.push(repeatInstructions); 
      timeline.push(instructionsRepeated);
    }
    timeline.push(setupStimulus);
    timeline.push(stimulusBlock(trialConfig));
  }

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
