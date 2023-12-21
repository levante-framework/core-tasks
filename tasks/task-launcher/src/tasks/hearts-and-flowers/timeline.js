// setup
import { jsPsych } from '../taskSetup';
import { fixation } from './trials/fixation';
import { initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';

// trials
import { exitFullscreen } from '../shared/trials';
import { stimulus } from './trials/stimulus';
import {  
  reminderHeart,
  reminderFlower,
  heartPracticeBlock1,
  heartPracticeBlock2,
  flowerPracticeBlock1,
  flowerPracticeBlock2,
  reminderHeartBlock,
  reminderFlowerBlock
} from './trials/practice';
import { 
  introduction, 
  heartInstructions, 
  flowerInstructions, 
  timeToPractice, 
  keepUp, 
  keepGoing, 
  timeToPlay, 
  heartsAndFlowers, 
  endGame
} from './trials/instructions';


// export let cat;
// export let cat2;


export default function buildHeartsAndFlowersTimeline(config, mediaAssets) {
    const preloadTrials = createPreloadTrials(mediaAssets).default

    initTrialSaving(config);
    const initialTimeline = initTimeline(config); 

//   cat = new Cat({
//     method: 'MLE',
//     minTheta: -6,
//     maxTheta: 6,
//     itemSelect: store.session('itemSelect'),
//   });

//   // Include new items in thetaEstimate
//   cat2 = new Cat({
//     method: 'MLE',
//     minTheta: -6,
//     maxTheta: 6,
//     itemSelect: store.session('itemSelect'),
//   });

  // introductionTrials, ifNotFullscreen,
  const timeline = [
    preloadTrials,
    ...initialTimeline.timeline, 
    introduction,
    heartInstructions,
    heartPracticeBlock1,
    heartPracticeBlock2,
    timeToPractice,
  ];

  // HEARTS
  for (let i = 0; i < 2; i++) {
    timeline.push(fixation)
    timeline.push(stimulus('heart'))
  }

  timeline.push(reminderHeart)
  timeline.push(keepUp)
  timeline.push(keepGoing)
  timeline.push(timeToPlay)

  // HEARTS
  for (let i = 0; i < 6; i++) {
    timeline.push(fixation)
    timeline.push(stimulus('heart'))
  }


  timeline.push(flowerInstructions)
  timeline.push(flowerPracticeBlock1)
  timeline.push(flowerPracticeBlock2)
  timeline.push(timeToPractice)

  // FLOWERS
  for (let i = 0; i < 2; i++) {
    timeline.push(fixation)
    timeline.push(stimulus('flower'))
  }

  timeline.push(reminderFlower)
  timeline.push(keepUp)
  timeline.push(keepGoing)
  timeline.push(timeToPlay)

  // Flowers
  for (let i = 0; i < 6; i++) {
    timeline.push(fixation)
    timeline.push(stimulus('flower'))
  }

  timeline.push(heartsAndFlowers)
  timeline.push(reminderHeartBlock)
  timeline.push(reminderFlowerBlock)
  timeline.push(timeToPractice)


  //MIXED (BOTH)
  for (let i = 0; i < 2; i++) {
    let random = Math.round(Math.random())
    timeline.push(fixation)
    timeline.push(stimulus(random <= 0.5 ? 'flower' : 'heart'))
  }

  timeline.push(keepUp)
  timeline.push(keepGoing)
  timeline.push(timeToPlay)

  //MIXED (BOTH)
  for (let i = 0; i < 6; i++) {
    let random = Math.round(Math.random())
    timeline.push(fixation)
    timeline.push(stimulus(random <= 0.5 ? 'flower' : 'heart'))
  }


  timeline.push(endGame, exitFullscreen);

  return { jsPsych, timeline };
}