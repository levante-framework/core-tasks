import 'regenerator-runtime/runtime';
import { initTimeline, initTrialSaving } from '../shared/helpers';

// setup
import { jsPsych } from '../taskSetup';
import { initializeCat } from '../taskSetup';
import store from 'store2';

// trials
import { exitFullscreen } from '../shared/trials';
import { getCorsiBlocks } from './trials/stimulus';

export default function buildMemoryTimeline(config, mediaAssets) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const corsiBlocks = {
    timeline: [
      getCorsiBlocks({ mode: 'display' }),
      getCorsiBlocks({ mode: 'input' }),
    ],
    repetitions: store.session.get('totalTrials'),
  };

  const timeline = [
    initialTimeline,
    corsiBlocks,
  ];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
