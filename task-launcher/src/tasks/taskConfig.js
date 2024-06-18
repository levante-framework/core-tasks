import mathTimeline from './math/timeline';
import { getCorpus, setSharedConfig, getTranslations } from './shared/helpers';
import matrixTimeline from './matrix-reasoning/timeline';
import mentalRotationTimeline from './mental-rotation/timeline';
import heartsAndFlowersTimeline from './hearts-and-flowers/timeline';
import memoryGameTimeline from './memory-game/timeline';
import sameDifferentSelectionTimeline from './same-different-selection/timeline';
import vocabTimeline from './vocab/timeline';
import tROGTimeline from './trog/timeline';
import tomTimeline from './theory-of-mind/timeline';

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
};
