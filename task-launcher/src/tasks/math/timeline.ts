import 'regenerator-runtime/runtime';
import store from 'store2';
// setup
//@ts-ignore
import { getStimulusBlockCount, initTrialSaving, initTimeline, createPreloadTrials, taskStore } from '../shared/helpers';
//@ts-ignore
import { jsPsych, initializeCat } from '../taskSetup';
// trials
import { slider } from './trials/sliderStimulus';
//@ts-ignore
import { afcStimulus, exitFullscreen, getAudioResponse, setupStimulus, taskFinished } from '../shared/trials';


export default function buildMathTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const stim = taskStore().nextStimulus;
      if (stim.assessmentStage === 'practice_response' || stim.trialType === 'instructions') {
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
        layoutConfig: {
          showPrompt: true
        }
      }),
    ],
    conditional_function: () => {
      return !taskStore().nextStimulus.trialType?.includes('Number Line');
    },
  };

  const sliderBlock = {
    timeline: [slider],
    conditional_function: () => {
      return taskStore().nextStimulus.trialType?.includes('Number Line');
    },
  };

  const pushSubTaskToTimeline = (fixationAndSetupBlock: any, stimulusBlockCount: number[]) => {
    for (let i = 0; i < stimulusBlockCount.length; i++) {
      const subTaskTimeline: any[] = [];
      // This is one block of subtask trials. ex. number-identification
      const subTaskBlock = {
        timeline: subTaskTimeline,
      };

      for (let j = 0; j < stimulusBlockCount[i]; j++) {
        // add trials to the block (this is the core procedure for each stimulus)
        const stimulusBlock = {
          timeline: [
            afcStimulusBlock,
            sliderBlock,
            ifRealTrialResponse,
          ],
          conditional_function: () => {
            if (taskStore().skipCurrentTrial) {
              taskStore('skipCurrentTrial', false);
              return false;
            }
            const stim = taskStore().nextStimulus;
            const skipBlockTrialType = store.page.get('skipCurrentBlock');
            if (stim.trialType === skipBlockTrialType) {
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

  initializeCat();

  pushSubTaskToTimeline(setupStimulus, getStimulusBlockCount(config.numberOfTrials, config.stimulusBlocks)); // Stimulus Trials
  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
