import egmaTimeline from './egma/timeline'
import { initEgmaConfig, initEgmaStore } from './egma/helpers'
import { fetchAndParseCorpus, initTrialSaving, initTimeline} from './shared/helpers'

// console.log({fetchAndParseCorpus})
// console.log({initTimeline})
// console.log({initTrialSaving})

// initEgma functions are defined but fetchCorpus is not. ???

export default {
    egmaMath: {
        initConfig: initEgmaConfig,
        initStore: initEgmaStore,
        loadCorpus: fetchAndParseCorpus,
        getTranslations: 'path/to/translations',
        buildTaskTimeline: egmaTimeline,
        variants: {
            // example
            egmaKids:{
                // does not need to have all properties, only what is different from base task
            }
        }
    },
    // somethingsTheSame: {
    //     initConfig: initEgmaConfig,
    //     initStore: initEgmaStore,
    //     loadCorpus: fetchAndParseCorpus,
    //     getTranslations: 'path/to/translations',
    //     buildTaskTimeline: egmaTimeline,
    //     variants: {
    //         // example
    //         egmaKids:{
    //             // does not need to have all properties, only what is different from base task
    //         }
    //     }
    // },
    // matrixReasoning: {
    //     initConfig: initEgmaConfig,
    //     initStore: initEgmaStore,
    //     loadCorpus: fetchAndParseCorpus,
    //     getTranslations: 'path/to/translations',
    //     buildTaskTimeline: egmaTimeline,
    //     variants: {
    //         // example
    //         egmaKids:{
    //             // does not need to have all properties, only what is different from base task
    //         }
    //     }
    // },
    // heartsAndFlowers: {
    //     initConfig: initEgmaConfig,
    //     initStore: initEgmaStore,
    //     loadCorpus: fetchAndParseCorpus,
    //     getTranslations: 'path/to/translations',
    //     buildTaskTimeline: egmaTimeline,
    //     variants: {
    //         // example
    //         egmaKids:{
    //             // does not need to have all properties, only what is different from base task
    //         }
    //     }
    // },
    // memoryGame: {
    //     initConfig: initEgmaConfig,
    //     initStore: initEgmaStore,
    //     loadCorpus: fetchAndParseCorpus,
    //     getTranslations: 'path/to/translations',
    //     buildTaskTimeline: egmaTimeline,
    //     variants: {
    //         // example
    //         egmaKids:{
    //             // does not need to have all properties, only what is different from base task
    //         }
    //     }
    // },
    // mentalRotation: {
    //     initConfig: initEgmaConfig,
    //     initStore: initEgmaStore,
    //     loadCorpus: fetchAndParseCorpus,
    //     getTranslations: 'path/to/translations',
    //     buildTaskTimeline: egmaTimeline,
    //     variants: {
    //         // example
    //         egmaKids:{
    //             // does not need to have all properties, only what is different from base task
    //         }
    //     }
    // },
}