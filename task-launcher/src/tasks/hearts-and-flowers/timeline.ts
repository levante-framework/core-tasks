// setup
import { taskStore } from '../../taskStore';
import { Logger } from '../../utils/logger';
import {
  camelize,
  createPreloadTrials,
  initTimeline,
  initTrialSaving,
  reportCorpusValidationErrors,
} from '../shared/helpers';
// trials
import { enterFullscreen, exitFullscreen } from '../shared/trials';
import { jsPsych } from '../taskSetup';
import { type CorpusRow, StimulusSideType, StimulusType } from './helpers/utils';
import { fixation } from './trials/fixation';
import {
  buildInstructionTrial,
  getEndGame,
  getInputInstructions,
  getLeftButtonDemo,
  getRightButtonDemo,
} from './trials/instructions';
import {
  buildInstructionPracticeTrial,
  buildMixedPracticeFeedback,
  buildStimulusInvariantPracticeFeedback,
} from './trials/practice';
import { buildHeartsOrFlowersTimelineVariables, buildMixedTimelineVariables, stimulus } from './trials/stimulus';

const BlockType = {
  Hearts: 'hearts',
  Flowers: 'flowers',
  Mixed: 'hearts and flowers',
} as const;
type BlockType = (typeof BlockType)[keyof typeof BlockType];
const BLOCK_STIMULUS_TYPE: Record<string, StimulusType> = {
  [BlockType.Hearts]: StimulusType.Heart,
  [BlockType.Flowers]: StimulusType.Flower,
};

const INTER_STIMULUS_INTERVAL = 500;
const PRACTICE_WIN_STREAK: Record<BlockType, number> = {
  [BlockType.Hearts]: 2,
  [BlockType.Flowers]: 2,
  [BlockType.Mixed]: 3,
};
// The faster mixed blocks
const FASTER_MIXED_BLOCKS = [3, 4];
const DEFAULT_SCREEN_IMAGE = 'animalBodySq';
const SCREEN_IMAGES: Record<string, string> = {
  'keep-up': 'keepupSq',
  'keep-going': 'rocketSq',
};

// Instruction practice trials show the stimulus on a fixed side, because the prompt audio names it.
// Keyed by the camelized audio_file of the row.
const INSTRUCTION_PRACTICE_SIDES: Record<string, StimulusSideType> = {
  heartInstruct2: StimulusSideType.Left,
  heartPracticeFeedback1: StimulusSideType.Right,
  flowerInstruct2: StimulusSideType.Right,
  flowerPracticeFeedback1: StimulusSideType.Left,
};

export default function buildHeartsAndFlowersTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const { heavyInstructions } = taskStore();
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen);

  const corpus: CorpusRow[] = taskStore().corpora.stimulus.filter(
    (row: CorpusRow) => !(heavyInstructions && FASTER_MIXED_BLOCKS.includes(row.block_index)),
  );

  const testTrialCount = corpus.filter((row) => row.assessmentStage === 'test_response').length;
  taskStore('totalTestTrials', testTrialCount);

  const timeline = [preloadTrials, initialTimeline];
  timeline.push(getInputInstructions());
  timeline.push(getLeftButtonDemo());
  timeline.push(getRightButtonDemo());

  const validationErrorMap: Record<string, string> = {};
  if (!testTrialCount) {
    validationErrorMap.corpus = 'no test rows; the corpus is missing or failed to load';
  }
  const missingTranslations: string[] = [];
  for (const rows of groupCorpusRows(corpus)) {
    // item_ids repeat across blocks, so include the block to tell rows apart
    const errorKey = `${rows[0].block_index}:${rows[0].itemId}`;
    const error = getRowsError(rows);
    if (error) {
      validationErrorMap[errorKey] = error;
      continue;
    }
    // A missing translation is logged but the screen is still shown, so a language missing one string keeps the same flow
    if (rows[0].assessmentStage === 'instructions' && !taskStore().translations[getAudioKey(rows[0])]) {
      missingTranslations.push(String(rows[0].audioFile));
    }
    timeline.push(buildRowsTimeline(rows, mediaAssets));
  }
  if (missingTranslations.length) {
    Logger.getInstance().error(new Error(`Missing translations for audio_file: ${missingTranslations.join(', ')}`));
  }
  reportCorpusValidationErrors(validationErrorMap);

  timeline.push(getEndGame());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}

/**
 * Groups consecutive practice or test rows of the same block, so each group becomes one block of trials.
 * Every instruction row is its own group.
 */
function groupCorpusRows(corpus: CorpusRow[]) {
  const groups: CorpusRow[][] = [];
  for (const row of corpus) {
    const currentGroup = groups[groups.length - 1];
    const previousRow = currentGroup?.[0];
    if (
      row.assessmentStage !== 'instructions' &&
      previousRow?.assessmentStage === row.assessmentStage &&
      previousRow.block_index === row.block_index
    ) {
      currentGroup.push(row);
    } else {
      groups.push([row]);
    }
  }
  return groups;
}

function getAudioKey(row: CorpusRow) {
  return camelize(String(row.audioFile ?? ''));
}

function isInstructionRow(row: CorpusRow) {
  return row.assessmentStage === 'instructions' && row.trialType === 'instructions';
}

function isPracticeInstructionRow(row: CorpusRow) {
  return row.assessmentStage === 'instructions' && row.trialType in BLOCK_STIMULUS_TYPE;
}

/** Returns a description of what is wrong with a group of rows, or null if it can be built. */
function getRowsError(rows: CorpusRow[]): string | null {
  const [row] = rows;

  if (isInstructionRow(row)) {
    return getAudioKey(row) ? null : 'missing audio_file';
  }
  if (isPracticeInstructionRow(row)) {
    return getAudioKey(row) in INSTRUCTION_PRACTICE_SIDES
      ? null
      : `no stimulus side defined for instruction practice audio_file "${row.audioFile}"`;
  }

  if (row.assessmentStage !== 'practice_response' && row.assessmentStage !== 'test_response') {
    return `unknown assessment_stage "${row.assessmentStage}" with trial_type "${row.trialType}"`;
  }
  if (!Object.values(BlockType).includes(row.trialType as BlockType)) {
    return `unknown trial_type "${row.trialType}"`;
  }
  // The block type decides how stimuli and sides are balanced across the block, so it can't vary within one
  if (rows.some((r) => r.trialType !== row.trialType)) {
    return 'rows in one block have different trial_type values';
  }
  const invalidTimeLimitRow = rows.find((r) => r.assessmentStage === 'test_response' && !(Number(r.timeLimit) > 0));
  if (invalidTimeLimitRow) {
    return `invalid time_limit "${invalidTimeLimitRow.timeLimit}"`;
  }
  return null;
}

function buildRowsTimeline(rows: CorpusRow[], mediaAssets: MediaAssetsType) {
  const [row] = rows;
  const audioKey = getAudioKey(row);

  if (isInstructionRow(row)) {
    const image = mediaAssets.images[SCREEN_IMAGES[row.itemId] ?? DEFAULT_SCREEN_IMAGE];
    return buildInstructionTrial(image, () => audioKey);
  }

  if (isPracticeInstructionRow(row)) {
    return buildPracticeInstructionBlock(row, mediaAssets);
  }

  return row.assessmentStage === 'practice_response' ? buildPracticeBlock(rows) : buildTestBlock(rows);
}

function buildPracticeInstructionBlock(row: CorpusRow, mediaAssets: MediaAssetsType) {
  const audioKey = getAudioKey(row);

  const instructionPracticeFeedback = buildStimulusInvariantPracticeFeedback(
    'heartsAndFlowersTryAgain',
    'feedbackGoodJob',
  );

  return {
    timeline: [
      buildInstructionPracticeTrial(
        BLOCK_STIMULUS_TYPE[row.trialType],
        taskStore().translations[audioKey],
        mediaAssets.audio[audioKey],
        INSTRUCTION_PRACTICE_SIDES[audioKey],
        audioKey,
      ),
      instructionPracticeFeedback,
    ],
    loop_function: () => taskStore().isCorrect === false,
  };
}

function buildPracticeBlock(rows: CorpusRow[]) {
  const [row] = rows;
  const blockType = row.trialType as BlockType;

  let practiceWinStreakCount = 0;
  const onStimulusTrialFinishTimelineCallback = (data: Record<string, unknown>) => {
    practiceWinStreakCount = data.correct ? practiceWinStreakCount + 1 : 0;
  };
  const onFeedbackTrialFinishTimelineCallback = (_data: Record<string, unknown>) => {
    if (practiceWinStreakCount >= PRACTICE_WIN_STREAK[blockType]) {
      jsPsych.endCurrentTimeline();
    }
  };

  const practiceFeedback =
    blockType === BlockType.Mixed
      ? buildMixedPracticeFeedback(
          'heartPracticeFeedback2',
          'feedbackGoodJob',
          'flowerPracticeFeedback2',
          'feedbackGoodJob',
          onFeedbackTrialFinishTimelineCallback,
        )
      : buildStimulusInvariantPracticeFeedback(
          blockType === BlockType.Hearts ? 'heartPracticeFeedback2' : 'flowerPracticeFeedback2',
          'feedbackGoodJob',
          onFeedbackTrialFinishTimelineCallback,
        );

  return {
    timeline: [fixation(INTER_STIMULUS_INTERVAL), stimulus(onStimulusTrialFinishTimelineCallback), practiceFeedback],
    timeline_variables: buildBlockTimelineVariables(rows),
    randomize_order: false,
  };
}

function buildTestBlock(rows: CorpusRow[]) {
  return {
    timeline: [fixation(INTER_STIMULUS_INTERVAL), stimulus()],
    timeline_variables: buildBlockTimelineVariables(rows),
    randomize_order: false,
  };
}

/**
 * One timeline variable per corpus row, in corpus order: row N of the block is trial N.
 * Each trial reads its settings from `corpusRow`. The stimulus (for mixed blocks) and its side
 * are balanced across the whole block, so they are generated for the block and added to each row.
 */
function buildBlockTimelineVariables(rows: CorpusRow[]) {
  const blockType = rows[0].trialType as BlockType;
  const stimuliAndSides =
    blockType === BlockType.Mixed
      ? buildMixedTimelineVariables(rows.length)
      : buildHeartsOrFlowersTimelineVariables(rows.length, BLOCK_STIMULUS_TYPE[blockType]);
  return rows.map((row, i) => ({ ...stimuliAndSides[i], corpusRow: row }));
}
