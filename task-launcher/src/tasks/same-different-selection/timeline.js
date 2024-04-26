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

  const stimulusBlock = {
    timeline: [setupStimulus, stimulus],
    conditional_function: () => {
      const stim = store.session.get('nextStimulus');
      console.log(stim.trialType);
      console.log(stim.trialType);
      if (stim.trialType.includes('match') || stim.trialType.includes('unique')) {
        console.log('afcMatch');
        return false;
      }
      console.log('stimulus');
      return true;
    },
    repetitions: 1,
  };

  const afcBlock = {
    timeline: [setupStimulus, afcMatch],
    conditional_function: () => {
      const stim = store.session.get('nextStimulus');
      console.log(stim.trialType);
      if (stim.trialType.includes('match') || stim.trialType.includes('unique')) {
        console.log('afcMatch');
        return true;
      }
      console.log('stimulus');
      return false;
    },
    repetitions: 1,
  };

  console.log(store.session.get('totalTrials'));
  const allBlocks = {
    //timeline: [stimulusBlock],
    //timeline: [afcBlock],
    timeline: [stimulusBlock, afcBlock],
    repetitions: store.session.get('totalTrials'),
  };

  const timeline = [preloadTrials, initialTimeline, allBlocks];
  console.log(timeline);

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
