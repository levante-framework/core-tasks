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
      const assessmentStage = taskStore().nextStimulus.assessmentStage; 

      if ((trialType === 'something-same-2' || trialType.includes('match')) && (assessmentStage != 'practice_response')) {
        return true;
      }
      return false;
    },
  };

  const stimulusBlock = {
    timeline: [
      stimulus
    ],
  };
  
  const feedbackBlock = {
    timeline: [
      feedback(true, 'feedbackCorrect', 'feedbackTryAgain')
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

  const { phase1, phase2a, phase2b, phase2c, phase2d, phase2e } = sdsPhaseCount

  for (let i = 0; i < phase1; i++) {
    timeline.push(setupStimulus)
    timeline.push(stimulusBlock)
    timeline.push(buttonNoise) // adds button noise for appropriate trials
  }

  // 1st matching phase (with feedback)
  for (let i = 0; i < phase2a; i++) {
    timeline.push(setupStimulus)
    timeline.push(afcBlock)
    timeline.push(buttonNoise) // adds button noise for appropriate trials
    timeline.push(feedbackBlock)
  }

  // test-dimensions phase
  for (let i = 0; i < phase2b; i++) { 
    timeline.push(setupStimulus)
    timeline.push(stimulusBlock)
  }

  // matching phase 
  for (let i = 0; i < phase2c; i++) {
    timeline.push(setupStimulus)
    timeline.push(afcBlock)
    timeline.push(buttonNoise) // adds button noise for appropriate trials
  }

   // test-dimensions phase
   for (let i = 0; i < phase2d; i++) { 
    timeline.push(setupStimulus)
    timeline.push(stimulusBlock)
  }

  // matching phase 
  for (let i = 0; i < phase2e; i++) {
    timeline.push(setupStimulus)
    timeline.push(afcBlock)
    timeline.push(buttonNoise) // adds button noise for appropriate trials
  }


  initializeCat();

  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
