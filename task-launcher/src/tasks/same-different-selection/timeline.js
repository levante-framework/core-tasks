import 'regenerator-runtime/runtime';
import store from 'store2';
import { initTrialSaving, initTimeline } from '../shared/helpers';

// setup
import { jsPsych } from '../taskSetup';
import { createPreloadTrials } from '../shared/helpers';
import { initializeCat } from '../taskSetup';

// trials
import { stimulus } from './trials/stimulus';
import { setupStimulus, exitFullscreen, taskFinished } from '../shared/trials';
import { afcMatch } from './trials/afcMatch';


export default function buildSameDifferentTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const stimulusBlock = {
    timeline: [
      stimulus
    ],
  };

  const afcBlock = {
    timeline: [
      afcMatch
    ],
  };


  const timeline = [
    preloadTrials, 
    initialTimeline, 
  ];

  const { phase1, phase2 } = store.session.get('sdsPhasesCount')

  for (let i = 0; i < phase1; i++) {
    timeline.push(setupStimulus)
    timeline.push(stimulusBlock)
  }

  for (let i = 0; i < phase2; i++) {
    timeline.push(setupStimulus)
    timeline.push(afcBlock)
  }


  initializeCat();

  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
