import 'regenerator-runtime/runtime';
import { initTrialSaving, initTimeline, taskStore } from '../shared/helpers';

// setup
import { jsPsych } from '../taskSetup';
import { createPreloadTrials, sdsPhaseCount } from '../shared/helpers';
import { initializeCat } from '../taskSetup';

// trials
import { stimulus } from './trials/stimulus';
import { setupStimulus, exitFullscreen, taskFinished } from '../shared/trials';
import { afcMatch } from './trials/afcMatch';
import { feedback, getAudioResponse } from '../shared/trials'; 


export default function buildSameDifferentTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;
  let feedbackGiven = false;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const buttonNoise = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const trialType = taskStore().nextStimulus.trialType;

      if (trialType === 'something-same-1' || trialType === 'test-dimensions') {
        return false;
      }
      return true;
    },
  };

  const stimulusBlock = {
    timeline: [
      stimulus
    ],
  };
  
  const feedbackBlock = {
    timeline: [
      feedback(true)
    ],
  
    conditional_function: () => {
      if (!feedbackGiven){
        feedbackGiven = true; 
        return true
      }
      return false
    }
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
    // timeline.push(buttonNoise) // adds button noise for appropriate trials
  }

  for (let i = 0; i < phase2; i++) {
    timeline.push(setupStimulus)
    timeline.push(afcBlock)
    // timeline.push(buttonNoise) // adds button noise for appropriate trials
    timeline.push(feedbackBlock)
  }


  initializeCat();

  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
