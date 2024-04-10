import mathTimeline from './math/timeline';
import { 
  fetchAndParseCorpus, 
  initSharedConfig, 
  initSharedStore,
  getTranslations,
} from './shared/helpers';
import matrixTimeline from './matrix-reasoning/timeline';
import mentalRotationTimeline from './mental-rotation/timeline';
import heartsAndFlowersTimeline from './hearts-and-flowers/timeline';
import memoryGameTimeline from './memory-game/timeline';
import sameDifferentSelectionTimeline from './same-different-selection/timeline';
import tROGTimeline from './trog/timeline';
import tomTimeline from './theory-of-mind/timeline';

// TODO: Abstract to import config from specifc task folder
// Will allow for multiple devs to work on the repo without merge conflicts
export default {
  // Need to change bucket name to match task name (math)
  egmaMath: {
    initConfig: initSharedConfig,
    initStore: initSharedStore,
    loadCorpus: fetchAndParseCorpus,
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
    initConfig: initSharedConfig,
    initStore: initSharedStore,
    loadCorpus: fetchAndParseCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: matrixTimeline,
    variants: {},
  },
  mentalRotation: {
    initConfig: initSharedConfig,
    initStore: initSharedStore,
    loadCorpus: fetchAndParseCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: mentalRotationTimeline,
    variants: {},
  },
  heartsAndFlowers: {
    initConfig: initSharedConfig,
    initStore: initSharedStore,
    loadCorpus: fetchAndParseCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: heartsAndFlowersTimeline,
    variants: {},
  },
  memoryGame: {
    initConfig: initSharedConfig,
    initStore: initSharedStore,
    loadCorpus: fetchAndParseCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: memoryGameTimeline,
    variants: {},
  },
  sameDifferentSelection: {
    initConfig: initSharedConfig,
    initStore: initSharedStore,
    loadCorpus: fetchAndParseCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: sameDifferentSelectionTimeline,
    variants: {},
  },
  trog: {
    initConfig: initSharedConfig,
    initStore: initSharedStore,
    loadCorpus: fetchAndParseCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: tROGTimeline,
    variants: {},
  },
  theoryOfMind: {
    initConfig: initSharedConfig,
    initStore: initSharedStore,
    loadCorpus: fetchAndParseCorpus,
    getTranslations: getTranslations,
    buildTaskTimeline: tomTimeline,
    variants: {},
  },
};
