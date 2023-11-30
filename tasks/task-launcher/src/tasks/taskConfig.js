import egmaTrials from './egma/trials'
import { egmaTimeline } from './egma/timeline'

export default {
    egmaMath: {
        // Operating on the idea that params are passed in - although argument can be made for them being set
        gameParams: {
            audioFeedback: '',
            language: '',
            skipInstructions: '',
            practiceCorpus: '',
            stimulusCorpus: '',
            sequentialPractice: '',
            sequentialStimulus: '',
            buttonLayout: '',
            numberOfTrials: '',
            taskName: '',
            numOfPracticeTrials: '',
            story: '',
            storyCorpus: '',
            stimulusBlocks: '',
            keyHelpers: ''
        },
        // What is this, trial params or the trials themselves?
        // How to deal with jsPsych cb funcs, conditional timelines, loops, repetitions, etc?
        // Passed in trial args:

        // Defining instances of trials
        trials: egmaTrials,
        // Needs to be passed in
        asssetsSrc: "https://storage.googleapis.com/egma-math",
        corpora: {
            content: {
                fields: [
                    'item', 
                    'target', 
                    'distractor1', 
                    'distractor1',
                    'distractor1', 
                    'difficulty', 
                    'prompt', 
                    'source'
                ],
                // Need to be passed in
                stimulus: '',
                practice: ''
            },
        },
        translation: 'path/to/translations',
        timeline: egmaTimeline,
        variants: {
            // example
            egmaKids:{
                // does not need to have all properties, only what is different from base task
            }
        }
    }
}