import 'regenerator-runtime/runtime';
// setup
//@ts-ignore
import { initTrialSaving, initTimeline, createPreloadTrials, taskStore } from '../shared/helpers';
import { instructions } from './trials/instructions';
//@ts-ignore
import { jsPsych, initializeCat } from '../taskSetup';
// trials
//@ts-ignore
import { afcStimulusTemplate, afcStimulus, exitFullscreen, setupStimulus, taskFinished, getAudioResponse } from '../shared/trials';
import { getLayoutConfig, validateCorpus } from './helpers/config';

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
    layoutConfigMap,
  };

  const stimulusBlock = (config: Record<string, any>) => ({
    timeline: [
      afcStimulusTemplate(config) 
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

  const numOfTrials = taskStore().totalTrials;
  for (let i = 0; i < numOfTrials; i += 1) {
    const finalTrialConfig = {
      ...trialConfig,
      // only the first 3 trials have audio
      layoutConfig: {
        noAudio: i > 2,
        staggered: {
          enabled: false,
          trialTypes: [],
        },
        showPrompt: true
      },
    };
    timeline.push(setupStimulus);
    timeline.push(stimulusBlock(trialConfig));
    timeline.push(ifRealTrialResponse); 
  }

  initializeCat();

  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
