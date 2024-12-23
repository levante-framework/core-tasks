import { initTimeline, initTrialSaving } from '../shared/helpers';
// setup
import { jsPsych } from '../taskSetup';
import { initializeCat } from '../taskSetup';
// trials
import { enterFullscreen, exitFullscreen, feedback, finishExperiment } from '../shared/trials';
import { getCorsiBlocks } from './trials/stimulus';
import { instructions, readyToPlay, reverseOrderPrompt } from './trials/instructions';

export default function buildMemoryTimeline(config: Record<string, any>) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);

  const corsiBlocksPractice = {
    timeline: [
      getCorsiBlocks({ mode: 'display', isPractice: true }),
      getCorsiBlocks({ mode: 'input', isPractice: true }),
      feedback(true, 'feedbackCorrect', 'memoryGameForwardTryAgain'),
    ],
    repetitions: 3,
  };

  const corsiBlocksStimulus = {
    timeline: [
      getCorsiBlocks({ mode: 'display' }),
      getCorsiBlocks({ mode: 'input' }),
    ],
    repetitions: 20,
  };

  // last forward trial by itself in order to reset sequence length back to 2 for backward phase
  const lastForwardTrial = {
    timeline: [
      getCorsiBlocks({mode: 'display'}),
      getCorsiBlocks({mode: 'input', resetSeq: true})
    ]
  }

  const corsiBlocksReverse = {
    timeline: [
      getCorsiBlocks({ mode: 'display', reverse: true}),
      getCorsiBlocks({ mode: 'input', reverse: true}),
    ],
    repetitions: 21,
  };

  const timeline: any[] = [
    initialTimeline,
    ...instructions,
    corsiBlocksPractice,
    readyToPlay,
    corsiBlocksStimulus,
    lastForwardTrial,
    reverseOrderPrompt,
    corsiBlocksReverse,
  ];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
