/* eslint-disable no-param-reassign */
import store from 'store2';
import { generateAssetObject, createPreloadTrials } from '@bdelab/roar-utils';
import { Cat } from '@bdelab/jscat';
import i18next from 'i18next';

// setup
import { initRoarJsPsych, initRoarTimeline } from './config/config';
import { csvTransformed } from './config/corpus';
import { jsPsych } from './jsPsych';
import assets from '../../assets.json';

// trials
import { audioResponse } from './trials/audioFeedback';
import { introductionTrials, postPracticeIntro } from './trials/introduction';
import { practiceFeedback } from './trials/practiceFeedback';
import { midBlockPageList, postBlockPageList, finalPage } from './trials/gameBreak';
import { ifNotFullscreen, exitFullscreen } from './trials/fullScreen';
import { setupFixationTest, setupFixationPractice } from './trials/setupFixation';
import { lexicalityTest, leixcalityPractice } from './trials/stimulus';
import { countdownTrials } from './trials/countdown';
import { heartStimulus } from './trials/hearts';

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
  const timeline = [preloadTrials, ];

  for (let i = 0; i < 10; i++) {
    timeline.push(heartStimulus)
  }

  // // the core procedure
  // const pushPracticeTotimeline = (array) => {
  //   array.forEach((element) => {
  //     const block = {
  //       timeline: [setupFixationPractice, leixcalityPractice, audioResponse, practiceFeedback],
  //       timeline_variables: [element],
  //     };
  //     timeline.push(block);
  //   });
  // };

  // const blockPracticeTrials = csvTransformed.practice.slice(0, config.totalTrialsPractice);

  // pushPracticeTotimeline(blockPracticeTrials);
  // timeline.push(postPracticeIntro);
  // timeline.push(ifNotFullscreen);

  // const coreProcedure = {
  //   timeline: [setupFixationTest, lexicalityTest, audioResponse, ifCoinTracking],
  // };

  // const pushTrialsTotimeline = (stimulusCounts) => {
  //   for (let i = 0; i < stimulusCounts.length; i += 1) {
  //     // for each block: add trials
  //     /* add first half of block */
  //     const roarMainProcBlock1 = {
  //       timeline: [coreProcedure],
  //       conditional_function: () => {
  //         if (stimulusCounts[i] === 0) {
  //           return false;
  //         }
  //         store.session.set('currentBlockIndex', i);
  //         return true;
  //       },
  //       repetitions: Math.floor(stimulusCounts[i] / 2) + 1,
  //     };
  //     /* add second half of block */
  //     const roarMainProcBlock2 = {
  //       timeline: [coreProcedure],
  //       conditional_function: () => stimulusCounts[i] !== 0,
  //       repetitions: stimulusCounts[i] - 1 - Math.floor(stimulusCounts[i] / 2),
  //     };
  //     const totalMainProc = {
  //       timeline: [
  //         countdownTrials,
  //         roarMainProcBlock1,
  //         midBlockPageList[i],
  //         ifNotFullscreen,
  //         countdownTrials,
  //         roarMainProcBlock2,
  //       ],
  //     };
  //     timeline.push(totalMainProc);
  //     if (i < stimulusCounts.length - 1) {
  //       timeline.push(postBlockPageList[i]);
  //       timeline.push(ifNotFullscreen);
  //     }
  //   }
  // };

  // pushTrialsTotimeline(config.stimulusCountList);
  timeline.push(finalPage, exitFullscreen);

  return { jsPsych, timeline };
}
