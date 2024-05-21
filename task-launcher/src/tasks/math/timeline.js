import 'regenerator-runtime/runtime';
import store from 'store2';
import groupBy from 'lodash/groupBy';
// setup
import { getStimulusBlockCount, initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';
import { jsPsych, initializeCat } from '../taskSetup';
// trials
import { slider } from './trials/sliderStimulus';
import {
  afcStimulus, 
  exitFullscreen, 
  getAudioResponse, 
  setupStimulus,
  taskFinished,
} from '../shared/trials';
import { instructions1, instructions2 } from './trials/instructions';

export default function buildMathTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const stim = store.session.get('nextStimulus');
      if (stim.notes === 'practice' || stim.trialType === 'instructions') {
        return false;
      }
      return true;
    },
  };

  const timeline = [
    preloadTrials,
    initialTimeline,
    //instructions1, // for adult pilot, not kids
    //instructions2,
  ];

  const afcStimulusBlock = {
    timeline: [
      afcStimulus({ 
        trialType: 'audio', // or 'html'
        responseAllowed: true,
        promptAboveButtons: true,
        task: config.task,
      }),
    ],
    conditional_function: () => {
      return !store.session.get('nextStimulus').trialType?.includes('Number Line');
    },
  };

  const sliderBlock = {
    timeline: [slider],
    conditional_function: () => {
      return store.session.get('nextStimulus').trialType?.includes('Number Line');
    },
  };

  const pushSubTaskToTimeline = (fixationAndSetupBlock, stimulusBlockCount) => {
    for (let i = 0; i < stimulusBlockCount.length; i++) {
      const subTaskTimeline = [];
      // This is one block of subtask trials. ex. number-identification
      const subTaskBlock = {
        timeline: subTaskTimeline,
      };

      for (let j = 0; j < stimulusBlockCount[i]; j++) {
        // add trials to the block (this is the core procedure for each stimulus)
        const stimulusBlock = {
          timeline: [afcStimulusBlock, sliderBlock, ifRealTrialResponse],
          conditional_function: () => {
            if (store.session.get('skipCurrentTrial')) {
              store.session.set('skipCurrentTrial', false);
              return false;
            } else {
              return true;
            }
          },
        };

        // Pushing in setup seperate so we can conditionally skip the stimulus block
        subTaskTimeline.push(fixationAndSetupBlock);
        subTaskTimeline.push(stimulusBlock);
      }

      timeline.push(subTaskBlock);
    }
  };

  const createSubTaskTimeline = (fixationAndSetupBlock, groupedTimeline) => {
    const tasks = groupedTimeline.keys();
    tasks.forEach(task => {
      const stimuli = groupedTimeline.get(task);
      // This is one block of subtask trials. ex. number-identification
      const subTaskBlock = {
        timeline: [],
        conditional_function: () => {
          if (store.session.get('skipCurrentBlock')) {
            store.session.set('skipCurrentBlock', false);
            return false;
          } else {
            return true;
          }
        },
      };
      stimuli.forEach(f => {
        let timelineBlock = afcStimulus({ 
          trialType: 'audio', // or 'html'
          responseAllowed: true,
          promptAboveButtons: true,
          task: config.task,
        });
        if (task.includes('Number Line')) {
          timelineBlock = slider;
        }
        // add trials to the block (this is the core procedure for each stimulus)
        const stimulusBlock = {
          timeline: [timelineBlock, ifRealTrialResponse],
          conditional_function: () => {
            const stim = store.session.get('nextStimulus');
            const skipBlockTrialType = store.page.get('skipCurrentBlock');
            console.log('mark://', 'conditional Function', {trialType: stim.trialType, skipBlockTrialType});
            if (stim.trialType === skipBlockTrialType) {
              return false;
            } else {
              return true;
            }
          },
        };
        // Pushing in setup seperate so we can conditionally skip the stimulus block
        subTaskBlock.timeline.push(fixationAndSetupBlock);
        subTaskBlock.timeline.push(stimulusBlock);

      });
      timeline.push(subTaskBlock);
    });
  };

  const groupedSubTimeLines = new Map();
  store.session.get('corpora').stimulus.forEach(s => {
    if (groupedSubTimeLines.has(s.trialType)) {
      const currentValues = groupedSubTimeLines.get(s.trialType);
      currentValues.push(s);
      groupedSubTimeLines.set(s.trialType, currentValues);
    } else {
      groupedSubTimeLines.set(s.trialType, [s]);
    }
    
  });

  initializeCat();

  // pushSubTaskToTimeline(setupStimulus, getStimulusBlockCount()); // Stimulus Trials
  createSubTaskTimeline(setupStimulus, groupedSubTimeLines);
  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
