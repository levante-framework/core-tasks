import mathTimeline from './math/timeline'
import { fetchAndParseCorpus, initSharedConfig, initSharedStore  } from './shared/helpers'
import matrixTimeline from './matrix-reasoning/timeline'
import mentalRotationTimeline from './mental-rotation/timeline'

// Abstract to import config from specifc task folder
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
}