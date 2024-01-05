// setup
import { jsPsych } from '../taskSetup';
import { fixation } from './trials/fixation';
import { initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';
import store from 'store2';

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

const randomPosition = () => Math.round(Math.random())

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


  // HEARTS PRACTICE
  const heartPracticeTimeline = {
    timeline: [
      fixation,
      stimulus(true),
    ],
    timeline_variables: [
      { stimulus: 'heart', position: 0 },
      { stimulus: 'heart', position: 1 },
      { stimulus: 'heart', position: randomPosition() },
      { stimulus: 'heart', position: randomPosition() },
      { stimulus: 'heart', position: randomPosition() },
      { stimulus: 'heart', position: randomPosition() },
    ],
    randomize_order: false,
  }

  const heartPostPracticeBlock = {
    timeline: [
      reminderHeart,
      keepUp,
      keepGoing,
      timeToPlay,
    ],
  }

  const heartTimeline = {
    timeline: [
      fixation,
      stimulus(),
    ],
    // The standard set is 4 trials, the first two are always the same.
    // The last two are randomly selected. This set is then repeated X times.
    // Based on Hearts and Flowers game
    timeline_variables: [
      { stimulus: 'heart', position: 0 },
      { stimulus: 'heart', position: 1 },
      { stimulus: 'heart', position: randomPosition() },
      { stimulus: 'heart', position: randomPosition() },
    ],
    // 12 trials total
    repetitions: 3
  }

  const flowerInstructionsBlock = {
    timeline: [
      flowerInstructions,
      flowerPracticeBlock1,
      flowerPracticeBlock2,
      timeToPractice,
    ]
  }

  const flowerPracticeTimeline = {
    timeline: [
      fixation,
      stimulus(true),
    ],
    timeline_variables: [
      { stimulus: 'flower', position: 0 },
      { stimulus: 'flower', position: 1 },
      { stimulus: 'flower', position: randomPosition() },
      { stimulus: 'flower', position: randomPosition() },
      { stimulus: 'flower', position: randomPosition() },
      { stimulus: 'flower', position: randomPosition() },
    ],
  }

  const flowerPostPracticeBlock = {
    timeline: [
      reminderFlower,
      keepUp,
      keepGoing,
      timeToPlay,
    ],
  }

  const flowerTimeline = {
    timeline: [
      fixation,
      stimulus(),
    ],
    timeline_variables: [
      { stimulus: 'flower', position: 0 },
      { stimulus: 'flower', position: 1 },
      { stimulus: 'flower', position: randomPosition() },
      { stimulus: 'flower', position: randomPosition() },
    ],
    // 16 trials total
    repetitions: config.numberOfTrials
  }


  const heartsAndFlowersInstructionsBlock = {
      timeline: [
        heartsAndFlowers,
        reminderHeartBlock,
        reminderFlowerBlock,
        timeToPractice,
      ]
  }

  const heartsAndFlowersPracticeTimeline = { 
    timeline: [
      fixation,
      stimulus(true),
    ],
    timeline_variables: [
      { stimulus: 'flower', position: 0 },
      { stimulus: 'heart', position: 1 },
      { stimulus: 'heart', position: randomPosition() },
      { stimulus: 'flower', position: randomPosition() },
      { stimulus: 'heart', position: randomPosition() },
      { stimulus: 'flower', position: randomPosition() },
    ],
  }

  const heartsAndFlowersPostPracticeBlock = {
    timeline: [
      keepUp,
      keepGoing,
      timeToPlay,
    ]
  }

  const heartsAndFlowersTimeline = {
    timeline: [
      fixation,
      stimulus(),
    ],
    timeline_variables: [
      { stimulus: 'heart', position: 0 },
      { stimulus: 'heart', position: 1 },
      { stimulus: 'flower', position: 0 },
      { stimulus: 'flower', position: 1 },
    ],
    sample: {
      type: 'without-replacement',
      size: 1,
    },
    repetitions: 16
  }

  // introductionTrials, ifNotFullscreen,
  const timeline = [
    preloadTrials,
    ...initialTimeline.timeline, 
    introduction,
    heartInstructions,
    heartPracticeBlock1,
    heartPracticeBlock2,
    timeToPractice,
    heartPracticeTimeline,
    heartPostPracticeBlock,
    heartTimeline,
    flowerInstructionsBlock,
    flowerPracticeTimeline,
    flowerPostPracticeBlock,
    flowerTimeline,
    heartsAndFlowersInstructionsBlock,
    heartsAndFlowersPracticeTimeline,
    heartsAndFlowersPostPracticeBlock,
    heartsAndFlowersTimeline,
    endGame,
    exitFullscreen
  ];

  return { jsPsych, timeline };
}