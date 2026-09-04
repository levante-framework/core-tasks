import { taskStore } from '../../taskStore';
import {
  createPreloadTrials,
  initTimeline,
  initTrialSaving,
  isCatBlockTimeExpired,
  prepareCorpus,
  prepareMultiBlockCat,
  setCatBlockTimeLimit,
} from '../shared/helpers';
import {
  enterFullscreen,
  exitFullscreen,
  feedback,
  fixationOnly,
  getAudioResponse,
  setupStimulusFromBlock,
  startCatBlock,
  taskFinished,
} from '../shared/trials';
import { initializeCat, jsPsych } from '../taskSetup';
import { setupSds } from './helpers/prepareSdsCorpus';
import { setTrialBlock } from './helpers/setTrialBlock';
import { afcMatch } from './trials/afcMatch';
import { legacyStimulus } from './trials/legacyStimulus';
import { stimulus } from './trials/stimulus';

export default function buildSameDifferentTimelineCat(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;
  const heavy: boolean = taskStore().heavyInstructions;

  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const preparedCorpus = prepareCorpus(corpus, 0, undefined, true);

  const catCorpus = setupSds(taskStore().corpora.stimulus);
  const allBlocks = prepareMultiBlockCat(catCorpus);

  const newCorpora = {
    downex: taskStore().corpora.downex,
    stimulus: allBlocks,
  };
  taskStore('corpora', newCorpora); // puts all blocks into taskStore

  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen);

  const buttonNoise = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const trialType = taskStore().nextStimulus.trialType;
      const assessmentStage = taskStore().nextStimulus.assessmentStage;

      if (
        (trialType === 'something-same-2' || trialType.includes('match')) &&
        assessmentStage !== 'practice_response'
      ) {
        return true;
      }
      return false;
    },
  };

  // used for instruction and practice trials
  const ipBlock = (trial: StimulusType) => {
    let trialGenerator: typeof afcMatch | typeof stimulus | typeof legacyStimulus;
    if (trial.trialType.includes('match')) {
      trialGenerator = afcMatch;
    } else if (taskStore().version === 2) {
      trialGenerator = stimulus;
    } else {
      trialGenerator = legacyStimulus;
    }

    const practice = trial.assessmentStage === 'practice_response';
    const timeline =
      practice && !trial.trialType.includes('something-same-1')
        ? [{ ...fixationOnly, stimulus: '' }, trialGenerator(trial), feedbackBlock]
        : [{ ...fixationOnly, stimulus: '' }, trialGenerator(trial)];

    return {
      timeline: timeline,
    };
  };

  const feedbackBlock = {
    timeline: [feedback(true)],
    conditional_function: () => {
      return taskStore().version === 2;
    },
  };

  // returns timeline object containing the appropriate trials - only runs if they match what is in taskStore
  function runCatTrials(trialNum: number, trialType: 'stimulus' | 'afc') {
    const timeline = [];
    for (let i = 0; i < trialNum; i++) {
      if (trialType === 'stimulus') {
        timeline.push(taskStore().version === 2 ? stimulus() : legacyStimulus());
        timeline.push(buttonNoise);
      } else {
        timeline.push(afcMatch());
        timeline.push(buttonNoise);
      }
    }

    return {
      timeline: timeline,
      conditional_function: () => {
        const stimulus = taskStore().nextStimulus;

        if (trialType === 'stimulus') {
          return (
            (stimulus.trialType === 'test-dimensions' && trialNum === 1) ||
            (stimulus.trialType.includes('something-same') && trialNum === 2)
          );
        } else {
          return stimulus.trialType === `${trialNum}-match`;
        }
      },
    };
  }

  const timeline = [preloadTrials, initialTimeline];

  // all instructions + practice trials
  let instructionPractice: StimulusType[] = preparedCorpus.ipLight;

  let fiveBlockIntroTrial: StimulusType;
  let fiveBlockIntro: any;
  if (taskStore().version === 2) {
    // separate this out so that it is inserted at the right place in the timeline
    fiveBlockIntroTrial = instructionPractice.find((trial) => trial.itemId === 'sds-instruct5') as StimulusType;
    instructionPractice = instructionPractice.filter((trial) => trial.itemId !== 'sds-instruct5');

    fiveBlockIntro = {
      timeline: [ipBlock(fiveBlockIntroTrial)],
      conditional_function: () => {
        return taskStore().nextStimulus.trialType === '4-match';
      },
    };
  }

  // returns practice + instruction trials for a given block
  function getPracticeInstructions(blockNum: number): StimulusType[] {
    return instructionPractice.filter((trial) => {
      if (Number.isNaN(trial.block_index)) return false;
      return trial.block_index === blockNum;
    });
  }

  // create list of numbers of trials per block
  const blockCountList = setTrialBlock(true).blockCountList;

  const effectiveBlockCount = !heavy && taskStore().version === 2 ? 2 : 3;
  setCatBlockTimeLimit(taskStore().maxTime, effectiveBlockCount);

  const totalRealTrials = blockCountList.reduce((acc, count, index) => {
    if (!heavy && index === 1 && taskStore().version === 2) {
      return acc;
    }
    return acc + count;
  }, 0);
  taskStore('totalTestTrials', totalRealTrials);

  const catTrialIteration = (index: number, isLastBlock = false) => {
    const innerTimeline: any[] = [{ ...setupStimulusFromBlock(index), stimulus: '' }];

    if (index === 0) {
      innerTimeline.push(runCatTrials(1, 'stimulus'));
    }
    if (index === 1) {
      innerTimeline.push(runCatTrials(2, 'stimulus'));
    }
    if (index === 2) {
      if (taskStore().version === 2) {
        innerTimeline.push(fiveBlockIntro);
      }
      innerTimeline.push(runCatTrials(2, 'afc'));
      innerTimeline.push(runCatTrials(3, 'afc'));
      innerTimeline.push(runCatTrials(4, 'afc'));
    }

    return {
      timeline: innerTimeline,
      conditional_function: () => !isCatBlockTimeExpired(isLastBlock),
    };
  };

  blockCountList.forEach((count, index) => {
    timeline.push(startCatBlock);

    const currentBlockInstructionPractice = getPracticeInstructions(index);

    currentBlockInstructionPractice.forEach((trial) => {
      timeline.push(ipBlock(trial));
    });

    // only younger kids get something-same blocks
    if (!heavy && index === 1 && taskStore().version === 2) {
      return;
    }

    const numOfTrials = count;
    const isLastBlock = index === blockCountList.length - 1;
    for (let i = 0; i < numOfTrials; i++) {
      timeline.push(catTrialIteration(index, isLastBlock));
    }
  });

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);
  return { jsPsych, timeline };
}
