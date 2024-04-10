import 'regenerator-runtime/runtime';
// setup
import store from 'store2';
import { initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';
import { jsPsych, initializeCat } from '../taskSetup';
// trials
import { afcStimulusWithTimeoutCondition } from '../shared/trials/afcStimulus';
import { exitFullscreen, setupPracticeConditional, setupStimulusConditional, setupInstructionConditional } from '../shared/trials';
import { taskFinished } from './trials/instructions';

export default function buildTROGTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;
  // console.log({mediaAssets})

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  // does not matter if trial has properties that don't belong to that type
  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
  };
  
  const timeline = [
    preloadTrials,
    initialTimeline,
  ];

  let totalInstruction = store.session.get('totalInstruction') || 0;
  let totalPractice = store.session.get('totalPractice') || 0;
  let totalStimulus = store.session.get('totalStimulus') || 0;

  if (totalInstruction > 0) { 
    const instructionBlock = {
      timeline: [setupInstructionConditional,afcStimulusWithTimeoutCondition(trialConfig)],
      repetitions: totalInstruction,
    }
    timeline.push(instructionBlock);
  }

  if (totalPractice > 0) { 
    const practiceBlock = {
      timeline: [setupPracticeConditional,afcStimulusWithTimeoutCondition(trialConfig)],
      repetitions: totalPractice,
    }
    timeline.push(practiceBlock);
  }

  if (totalStimulus > 0) { 
    const stimulusBlock = {
      timeline: [setupStimulusConditional, afcStimulusWithTimeoutCondition(trialConfig)],
      repetitions: totalStimulus,
    };
    timeline.push(stimulusBlock);
  }

  initializeCat();

  // final screens
  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
