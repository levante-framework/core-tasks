// @ts-ignore
import { getCorpus, setSharedConfig, getTranslations } from './shared/helpers';
// @ts-ignore
import mathTimeline from './math/timeline';
// @ts-ignore
import matrixTimeline from './matrix-reasoning/timeline';
// @ts-ignore
import mentalRotationTimeline from './mental-rotation/timeline';
// @ts-ignore
import heartsAndFlowersTimeline from './hearts-and-flowers/timeline';
// @ts-ignore
import memoryGameTimeline from './memory-game/timeline';
// @ts-ignore
import sameDifferentSelectionTimeline from './same-different-selection/timeline';
// @ts-ignore
import vocabTimeline from './vocab/timeline';
// @ts-ignore
import tomTimeline from './theory-of-mind/timeline';
// @ts-ignore
import introTimeline from './intro/timeline';
import tROGTimeline from './trog/timeline';

// TODO: Abstract to import config from specifc task folder
// Will allow for multiple devs to work on the repo without merge conflicts
export default {
  // Need to change bucket name to match task name (math)
  egmaMath: {
    setConfig: setSharedConfig,
    getCorpus: getCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: mathTimeline,
    variants: {
      // example
      egmaMathKids: {
        // does not need to have all properties, only what is different from base task
      },
    },
  },
  matrixReasoning: {
    setConfig: setSharedConfig,
    getCorpus: getCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: matrixTimeline,
    variants: {},
  },
  mentalRotation: {
    setConfig: setSharedConfig,
    getCorpus: getCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: mentalRotationTimeline,
    variants: {},
  },
  heartsAndFlowers: {
    setConfig: setSharedConfig,
    getCorpus: getCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: heartsAndFlowersTimeline,
    variants: {},
  },
  memoryGame: {
    setConfig: setSharedConfig,
    getCorpus: getCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: memoryGameTimeline,
    variants: {},
  },
  sameDifferentSelection: {
    setConfig: setSharedConfig,
    getCorpus: getCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: sameDifferentSelectionTimeline,
    variants: {},
  },
  trog: {
    setConfig: setSharedConfig,
    getCorpus: getCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: tROGTimeline,
    variants: {},
  },
  vocab: {
    setConfig: setSharedConfig,
    getCorpus: getCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: vocabTimeline,
  },
  theoryOfMind: {
    setConfig: setSharedConfig,
    getCorpus: getCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: tomTimeline,
    variants: {},
  },
  intro: {
    setConfig: setSharedConfig,
    getCorpus: getCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: introTimeline,
    variants: {},
  },
};
