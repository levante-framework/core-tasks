import 'regenerator-runtime/runtime';
import { initTimeline, initTrialSaving } from '../shared/helpers';

// setup
import { jsPsych } from '../taskSetup';
import { initializeCat } from '../taskSetup';
import { createPreloadTrials } from '../shared/helpers';
import store from 'store2';

// trials
import { exitFullscreen } from '../shared/trials';
import { corsiBlocksDisplay, corsiBlocks } from './trials/stimulus';

export default function buildMemoryTimeline(config, mediaAssets) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const corsiBlock = {
    timeline: [corsiBlocksDisplay, corsiBlocks],
    repetitions: store.session.get('maxStimulusTrials'),
  };

  const timeline = [
    // preloadTrials,
    initialTimeline,
    corsiBlock,
  ];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
