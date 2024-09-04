import 'regenerator-runtime/runtime';
// setup
// @ts-ignore
import { jsPsych, initializeCat } from '../taskSetup';
// @ts-ignore
import { createPreloadTrials, taskStore, initTrialSaving, initTimeline } from '../shared/helpers';
// trials
// @ts-ignore
import { afcStimulus, afcStimulusTemplate, taskFinished, exitFullscreen, setupStimulus, getAudioResponse } from '../shared/trials';
import { imageInstructions, videoInstructionsFit, videoInstructionsMisfit } from './trials/instructions';
import { getLayoutConfig, validateCorpus } from './helpers/config';

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
  const messages = validateCorpus(corpus, mediaAssets);

  if (messages.length) {
    console.error('The following errors were found');
    console.table(messages);
    throw new Error('Something went wrong. Please look in the console for error details');
  }
  const layoutConfigMap: Record<string, LayoutConfigType> = {};
  let i = 0;
  for (const c of corpus) {
    layoutConfigMap[c.itemId] = getLayoutConfig(c, i);
    i += 1;
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

  const numOfTrials = taskStore().totalTrials;
  for (let i = 0; i < numOfTrials; i++) {
    timeline.push(setupStimulus);
    timeline.push(stimulusBlock);
  }

  initializeCat();

  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
