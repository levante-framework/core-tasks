import egmaTimeline from './egma/timeline'
import { fetchAndParseCorpus, initSharedConfig, initSharedStore  } from './shared/helpers'
import matrixTimeline from './matrix-reasoning/timeline'

// Abstract to import config from specifc task folder
export default {
    egmaMath: {
        initConfig: initSharedConfig,
        initStore: initSharedStore,
        loadCorpus: fetchAndParseCorpus,
        getTranslations: 'getTranslationsFunc()',
        buildTaskTimeline: egmaTimeline,
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
}