import 'regenerator-runtime/runtime';
import { initTrialSaving, initTimeline, taskStore } from '../shared/helpers';

// setup
import { jsPsych } from '../taskSetup';
import { createPreloadTrials, sdsPhaseCount } from '../shared/helpers';
import { initializeCat } from '../taskSetup';

// trials
import { stimulus, numIncorrect } from './trials/stimulus';
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
      const finished = numIncorrect('numIncorrect') === taskStore().maxIncorrect; 

      if ((trialType === 'something-same-2' || trialType.includes('match')) && (assessmentStage != 'practice_response') && !finished) {
        return true;
      }
      return false;
    },
  };

  const setup = {
    timeline: [setupStimulus], 

    conditional_function: () => {
      return numIncorrect('numIncorrect') < taskStore().maxIncorrect; // skip trial if the user has reached max incorrect answers
    }
  }

  const stimulusBlock = {
    timeline: [
      stimulus
    ],
    
    conditional_function: () => {
      return numIncorrect('numIncorrect') < taskStore().maxIncorrect; // skip trial if the user has reached max incorrect answers
    }
    
  };
  
  const feedbackBlock = {
    timeline: [
      feedback(true, 'feedbackCorrect', 'feedbackTryAgain')
    ],
  
    conditional_function: () => {
      const finished = numIncorrect('numIncorrect') === taskStore().maxIncorrect; 

      if (!feedbackGiven && !finished){
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
    
    conditional_function: () => {
      return numIncorrect('numIncorrect') < taskStore().maxIncorrect; // skip trial if the user has reached max incorrect answers
    }
    
  };

  const timeline = [
    preloadTrials, 
    initialTimeline, 
  ];

  const { phase1, phase2a, phase2b, phase2c, phase2d, phase2e } = sdsPhaseCount

  for (let i = 0; i < phase1; i++) {
    timeline.push(setup)
    timeline.push(stimulusBlock)
    timeline.push(buttonNoise) // adds button noise for appropriate trials
  }

  // 1st matching phase (with feedback)
  for (let i = 0; i < phase2a; i++) {
    timeline.push(setup)
    timeline.push(afcBlock)
    timeline.push(buttonNoise) // adds button noise for appropriate trials
    timeline.push(feedbackBlock)
  }

  // test-dimensions phase
  for (let i = 0; i < phase2b; i++) { 
    timeline.push(setup)
    timeline.push(stimulusBlock)
  }

  // matching phase 
  for (let i = 0; i < phase2c; i++) {
    timeline.push(setup)
    timeline.push(afcBlock)
    timeline.push(buttonNoise) // adds button noise for appropriate trials
  }

   // test-dimensions phase
   for (let i = 0; i < phase2d; i++) { 
    timeline.push(setup)
    timeline.push(stimulusBlock)
  }

  // matching phase 
  for (let i = 0; i < phase2e; i++) {
    timeline.push(setup)
    timeline.push(afcBlock)
    timeline.push(buttonNoise) // adds button noise for appropriate trials
  }


  initializeCat();

  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
