import 'regenerator-runtime/runtime';
// setup
//@ts-ignore
import { initTrialSaving, initTimeline, createPreloadTrials, taskStore } from '../shared/helpers';
import { instructions } from './trials/instructions';
//@ts-ignore
import { jsPsych, initializeCat } from '../taskSetup';
// trials
//@ts-ignore
import { afcStimulusTemplate, exitFullscreen, setupStimulus, taskFinished, getAudioResponse } from '../shared/trials';
import { getLayoutConfig } from './helpers/config';
import { repeatInstructionsMessage } from '../shared/trials/repeatInstructions';

export default function buildRoarInferenceTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
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

  const timeline = [preloadTrials, initialTimeline, ...instructions];
  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const translations: Record<string, string> = taskStore().translations;
  const validationErrorMap: Record<string, string> = {}; 
  const layoutConfigMap: Record<string, LayoutConfigType> = {};
  const numStories = taskStore().numStories;

  // const shuffledCorpus = shuffleStories(corpus, numStories, 'storyId');
  // console.log('mark://', {shuffledCorpus, numStories});
  console.log('mark://', 'shuffled corpus', {corpus});

  let i = 0;
  for (const c of corpus) {
    const { itemConfig, errorMessages } = getLayoutConfig(c, translations, mediaAssets, i);
    layoutConfigMap[c.itemId] = itemConfig;
    layoutConfigMap[c.itemId].story = c.story;
    layoutConfigMap[c.itemId].storyId = c.storyId;
    if (errorMessages.length) {
      validationErrorMap[c.itemId] = errorMessages.join('; ');
    }
    i += 1;
  }
  // const numStories = taskStore().numStories;
  // const groupedStories = corpus.reduce<Record<string, StimulusType[]>>((acc, item) => {
  //   if (!acc[item.storyId]) acc[item.storyId] = [];
  //   acc[item.storyId].push(item);
  //   return acc;
  // }, {});
  
  // console.log('groupedStories:', groupedStories);
  
  // if (numStories) {
  //   // Get an array of story IDs and shuffle them
  //   const shuffledStoryIds = Object.keys(groupedStories).sort(() => 0.5 - Math.random());
  //   const selectedStoryIds = shuffledStoryIds.slice(0, numStories); // Select up to numStories
  
  //   for (const storyId of selectedStoryIds) {
  //     const storyItems = groupedStories[storyId];
  
  //     for (const c of storyItems) {
  //       const { itemConfig, errorMessages } = getLayoutConfig(c, translations, mediaAssets, i);
  //       layoutConfigMap[c.itemId] = { ...itemConfig, story: c.story, storyId: c.storyId };
  //       console.log('layoutConfigMap:', layoutConfigMap[c.itemId]);
  
  //       if (errorMessages.length) {
  //         validationErrorMap[c.itemId] = errorMessages.join('; ');
  //       }
  //       i += 1;
  //     }
  //   }
  // } else {
  //   for (const storyItems of Object.values(groupedStories)) {
  //     for (const c of storyItems) {
  //       const { itemConfig, errorMessages } = getLayoutConfig(c, translations, mediaAssets, i);
  //       layoutConfigMap[c.itemId] = { ...itemConfig, story: c.story, storyId: c.storyId  };
  //       console.log('layoutConfigMap:', layoutConfigMap[c.itemId]);
  
  //       if (errorMessages.length) {
  //         validationErrorMap[c.itemId] = errorMessages.join('; ');
  //       }
  //       i += 1;
  //     }
  //   }
  // }

  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
    layoutConfigMap,
  };

  const stimulusBlock = (config: Record<string, any>) => ({
    timeline: [
      afcStimulusTemplate(config),
    ],
    // true = execute normally, false = skip
    conditional_function: () => {
      if (taskStore().skipCurrentTrial) {
        taskStore('skipCurrentTrial', false);
        return false;
      } else {
        return true;
      }
    },
  });

  const repeatInstructions = {
    timeline: [
      repeatInstructionsMessage,
    ],
    conditional_function: () => {
      return taskStore().numIncorrect >= 2; 
    }
  }; 

  const instructionsRepeated = {
    timeline: instructions,
    conditional_function: () => {
      return taskStore().numIncorrect >= 2; 
    }
  }

  const numOfTrials = taskStore().totalTrials;
  for (let i = 0; i < numOfTrials; i += 1) {
    if(i === 4){
      timeline.push(repeatInstructions); 
      timeline.push(instructionsRepeated);
    }
    timeline.push(setupStimulus);
    timeline.push(stimulusBlock(trialConfig));
    timeline.push(ifRealTrialResponse); 
  }

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
