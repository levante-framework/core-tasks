import 'regenerator-runtime/runtime';
import { initTrialSaving, initTimeline } from '../shared/helpers';

// setup
import { jsPsych } from '../taskSetup';
import { createPreloadTrials, sdsPhaseCount } from '../shared/helpers';
import { initializeCat } from '../taskSetup';

// trials
import { stimulus } from './trials/stimulus';
import { setupStimulus, exitFullscreen, taskFinished } from '../shared/trials';
import { afcMatch } from './trials/afcMatch';
import { feedback } from '../shared/trials'; 


export default function buildSameDifferentTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const stimulusBlock = {
    timeline: [
      stimulus
    ],
  };
  
  const feedbackBlock = {
    timeline: [
      feedback(true)
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

  const { phase1, phase2 } = sdsPhaseCount

  for (let i = 0; i < phase1; i++) {
    timeline.push(setupStimulus)
    timeline.push(stimulusBlock)
  }

  for (let i = 0; i < phase2; i++) {
    timeline.push(setupStimulus)
    timeline.push(afcBlock)

    if (i < 2){
      timeline.push(feedbackBlock)
    }
  }


  initializeCat();

  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
