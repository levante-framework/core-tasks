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

  const instructionBlock = {
    timeline: [setupInstructionConditional,afcStimulusWithTimeoutCondition(trialConfig)],
    repetitions: store.session.get('totalInstruction'),
  }
  const practiceBlock = {
    timeline: [setupPracticeConditional,afcStimulusWithTimeoutCondition(trialConfig)],
    repetitions: store.session.get('totalPractice'),
  }

  const stimulusBlock = {
    timeline: [setupStimulusConditional, afcStimulusWithTimeoutCondition(trialConfig)],
    repetitions: store.session.get('totalTrials'),
  };

  const timeline = [
    preloadTrials,
    initialTimeline,
    instructionBlock,
    practiceBlock,
    stimulusBlock,
  ];

  initializeCat();

  // final screens
  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
