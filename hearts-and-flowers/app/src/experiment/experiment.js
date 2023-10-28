/* eslint-disable no-param-reassign */
import store from 'store2';
import { generateAssetObject, createPreloadTrials } from '@bdelab/roar-utils';
import { Cat } from '@bdelab/jscat';
import i18next from 'i18next';

// setup
import { initRoarJsPsych, initRoarTimeline } from './config/config';
import { jsPsych } from './jsPsych';
import assets from '../../assets.json';

// trials
import { finalPage } from './trials/gameBreak';
import { ifNotFullscreen, exitFullscreen } from './trials/fullScreen';
import { heartStimulus } from './trials/hearts';
import {  
  heartPractice1, 
  heartPractice2, 
  flowerPractice1,
  flowerPractice2,
  practiceFeedbackRight, 
  practiceFeedbackWrong } from './trials/practice';
import { introduction, heartInstructions, flowerInstructions } from './trials/instructions';
import { fixation } from './trials/setupFixation';

const bucketURI = 'https://storage.googleapis.com/hearts-and-flowers';

// eslint-disable-next-line import/no-mutable-exports
export let cat;
// eslint-disable-next-line import/no-mutable-exports
export let cat2;

// eslint-disable-next-line import/no-mutable-exports
export let mediaAssets;
// eslint-disable-next-line import/no-mutable-exports
export let preloadTrials;

export function buildExperiment(config) {
  mediaAssets = generateAssetObject(assets, bucketURI, i18next.language);
  preloadTrials = createPreloadTrials(assets, bucketURI, i18next.language).default;

  // Initialize jsPsych and timeline
  initRoarJsPsych(config);
  const initialTimeline = initRoarTimeline(config);

  cat = new Cat({
    method: 'MLE',
    minTheta: -6,
    maxTheta: 6,
    itemSelect: store.session('itemSelect'),
  });

  // Include new items in thetaEstimate
  cat2 = new Cat({
    method: 'MLE',
    minTheta: -6,
    maxTheta: 6,
    itemSelect: store.session('itemSelect'),
  });

  // introductionTrials, ifNotFullscreen,...initialTimeline.timeline,  countdownTrials
  const timeline = [
    preloadTrials, 
    introduction,
    heartInstructions,
    heartPractice1,
    heartPractice2,
    // practiceFeedbackRight, 

    // practiceFeedbackWrong
  ];

  // // HEARTS
  // for (let i = 0; i < 5; i++) {
  //   timeline.push(fixation)
  //   timeline.push(heartStimulus('heart'))
  // }

  timeline.push(flowerInstructions)
  timeline.push(flowerPractice1)
  timeline.push(flowerPractice2)

  //FLOWERS
  for (let i = 0; i < 5; i++) {
    timeline.push(fixation)
    timeline.push(heartStimulus('flower'))
  }

  //MIXED (BOTH)
  for (let i = 0; i < 10; i++) {
    let random = Math.round(Math.random())
    timeline.push(fixation)
    timeline.push(heartStimulus(random <= 0.5 ? 'flower' : 'heart'))
  }


  timeline.push(finalPage, exitFullscreen);

  return { jsPsych, timeline };
}
