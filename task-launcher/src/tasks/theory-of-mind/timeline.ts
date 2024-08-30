import 'regenerator-runtime/runtime';
// setup
//@ts-ignore
import { initTrialSaving, initTimeline, createPreloadTrials, taskStore } from '../shared/helpers';
//@ts-ignore
import { jsPsych, initializeCat } from '../taskSetup';
// trials
//@ts-ignore
import { afcStimulusTemplate, afcStimulus, exitFullscreen, setupStimulus, taskFinished } from '../shared/trials';
import { getLayoutConfig, validateCorpus } from './helpers/config';

export default function buildTOMTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const timeline = [preloadTrials, initialTimeline];  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const messages = validateCorpus(corpus, mediaAssets);

  if (messages.length) {
    console.error('The following errors were found');
    console.table(messages);
    throw new Error('Something went wrong. Please look in the console for error details');
  }
  const layoutConfigMap: Record<string, LayoutConfigType> = {};
  for (const c of corpus) {
    layoutConfigMap[c.itemId] = getLayoutConfig(c);
  }

  // does not matter if trial has properties that don't belong to that type
  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
    layoutConfigMap,
  };

  const stimulusBlock = {
    timeline: [
      afcStimulusTemplate(trialConfig)
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
