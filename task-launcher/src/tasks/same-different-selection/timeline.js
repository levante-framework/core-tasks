import 'regenerator-runtime/runtime';
import store from 'store2';
import { initTrialSaving, initTimeline } from '../shared/helpers';

// setup
import { jsPsych } from '../taskSetup';
import { createPreloadTrials } from '../shared/helpers';
import { initializeCat } from '../taskSetup';

// trials
import { stimulus } from './trials/stimulus';
import { setupPractice, setupStimulus, exitFullscreen } from '../shared/trials';
import { afcMatch } from './trials/afcMatch';

export default function buildSameDifferentTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const practiceBlock = {
    timeline: [setupPractice, stimulus],
    repetitions: store.session.get('config').numOfPracticeTrials,
  };

  const stimulusBlock = {
    timeline: [setupStimulus, stimulus],
    repetitions: store.session.get('totalTrials'),
  };

  const afcBlock = {
    timeline: [setupStimulus, afcMatch],
    repetitions: 2,
  };

  const timeline = [preloadTrials, initialTimeline, afcBlock, practiceBlock, stimulusBlock];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
