import 'regenerator-runtime/runtime';
// setup
import { initTrialSaving, initTimeline, createPreloadTrials, convertItemToString } from '../shared/helpers';
import { instructions } from './trials/instructions';
import { jsPsych, initializeCat } from '../taskSetup';
// trials
import { exitFullscreen, setupStimulus, taskFinished, enterFullscreen, finishExperiment } from '../shared/trials';
import { AfcStimulusInput, afcStimulusInference } from './trials/afcInference';
import { getLayoutConfig } from './helpers/config';
import { repeatInstructionsMessage } from '../shared/trials/repeatInstructions';
import type { LayoutConfigTypeInference } from './types/inferenceTypes';
import { taskStore } from '../../taskStore';

export default function buildRoarInferenceTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);

  const timeline = [preloadTrials, initialTimeline, ...instructions];
  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const translations: Record<string, string> = taskStore().translations;
  const validationErrorMap: Record<string, string> = {};
  const layoutConfigMap: Record<string, LayoutConfigTypeInference> = {};

  let i = 0;
  for (const c of corpus) {
    const { itemConfig, errorMessages } = getLayoutConfig(c, translations, mediaAssets, i);
    layoutConfigMap[c.itemId] = itemConfig;
    layoutConfigMap[c.itemId].story = convertItemToString(c.item);
    layoutConfigMap[c.itemId].storyId = c.itemId;
    if (errorMessages.length) {
      validationErrorMap[c.itemId] = errorMessages.join('; ');
    }
    i += 1;
  }

  const trialConfig: AfcStimulusInput = {
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
    layoutConfigMap,
  };

  const stimulusBlock = (config: AfcStimulusInput) => ({
    timeline: [afcStimulusInference(config)],
  });

  const repeatInstructions = {
    timeline: [repeatInstructionsMessage],
    conditional_function: () => {
      return taskStore().numIncorrect >= 2;
    },
  };

  const instructionsRepeated = {
    timeline: instructions,
    conditional_function: () => {
      return taskStore().numIncorrect >= 2;
    },
  };

  const inferenceNumStories = taskStore().inferenceNumStories;
  const stimulusBlocks = taskStore().stimulusBlocks;

  const numOfTrials = inferenceNumStories * stimulusBlocks ?? taskStore().totalTrials;

  for (let i = 0; i < numOfTrials; i += 1) {
    if (i === 4) {
      timeline.push(repeatInstructions);
      timeline.push(instructionsRepeated);
    }
    timeline.push({
      ...setupStimulus,
      stimulus: ``, // Custom stimulus
    });
    timeline.push(stimulusBlock(trialConfig));
    // timeline.push(ifRealTrialResponse);
  }

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
