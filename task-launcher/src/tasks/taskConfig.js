import mathTimeline from './math/timeline'
import { fetchAndParseCorpus, initSharedConfig, initSharedStore  } from './shared/helpers'
import matrixTimeline from './matrix-reasoning/timeline'
import mentalRotationTimeline from './mental-rotation/timeline'
import heartsAndFlowersTimeline from './hearts-and-flowers/timeline'
import memoryGameTimeline from './memory-game/timeline'
import sameDifferentSelectionTimeline from './same-different-selection/timeline'

// TODO: Abstract to import config from specifc task folder
// Will allow for multiple devs to work on the repo without merge conflicts
export default {
    // Need to change bucket name to match task name (math)
    egmaMath: {
        initConfig: initSharedConfig,
        initStore: initSharedStore,
        loadCorpus: fetchAndParseCorpus,
        getTranslations: 'getTranslationsFunc()',
        buildTaskTimeline: mathTimeline,
        variants: {
            // example
            egmaMathKids:{
                // does not need to have all properties, only what is different from base task
            }
        }
    },
    matrixReasoning: {
        initConfig: initSharedConfig,
        initStore: initSharedStore,
        loadCorpus: fetchAndParseCorpus,
        getTranslations: 'getTranslationsFunc()',
        buildTaskTimeline: matrixTimeline,
        variants: {}
    },
    mentalRotation: {
        initConfig: initSharedConfig,
        initStore: initSharedStore,
        loadCorpus: fetchAndParseCorpus,
        getTranslations: 'getTranslationsFunc()',
        buildTaskTimeline: mentalRotationTimeline,
        variants: {}
    },
    heartsAndFlowers: {
        initConfig: initSharedConfig,
        initStore: initSharedStore,
        loadCorpus: fetchAndParseCorpus,
        getTranslations: 'getTranslationsFunc()',
        buildTaskTimeline: heartsAndFlowersTimeline,
        variants: {}
    },
    memoryGame: {
        initConfig: initSharedConfig,
        initStore: initSharedStore,
        loadCorpus: fetchAndParseCorpus,
        getTranslations: 'getTranslationsFunc()',
        buildTaskTimeline: memoryGameTimeline,
        variants: {}
    },
    sameDifferentSelection: {
        initConfig: initSharedConfig,
        initStore: initSharedStore,
        loadCorpus: fetchAndParseCorpus,
        getTranslations: 'getTranslationsFunc()',
        buildTaskTimeline: sameDifferentSelectionTimeline,
        variants: {}
    },
}