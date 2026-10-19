// setup
import { taskStore } from '../../taskStore';
import { createPreloadTrials, initTimeline, initTrialSaving, reportCorpusValidationErrors } from '../shared/helpers';
// trials
import { enterFullscreen, exitFullscreen } from '../shared/trials';
import { jsPsych } from '../taskSetup';
import {
  BLOCK_STIMULUS_TYPE,
  BlockType,
  type CorpusRow,
  getAudioKey,
  getImageKey,
  INSTRUCTION_PRACTICE_SIDES,
  isInstructionRow,
  isPracticeInstructionRow,
} from './helpers/utils';
import { getCorpusValidationErrors } from './helpers/validation';
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

const INTER_STIMULUS_INTERVAL = 500;
const PRACTICE_WIN_STREAK: Record<BlockType, number> = {
  [BlockType.Hearts]: 2,
  [BlockType.Flowers]: 2,
  [BlockType.Mixed]: 3,
};
// The faster mixed blocks
const FASTER_MIXED_BLOCKS = [3, 4];

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

  const rowGroups = groupCorpusRows(corpus);
  reportCorpusValidationErrors(getCorpusValidationErrors(rowGroups, mediaAssets, taskStore().translations));
  for (const rows of rowGroups) {
    timeline.push(buildRowsTimeline(rows, mediaAssets));
  }

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

function buildRowsTimeline(rows: CorpusRow[], mediaAssets: MediaAssetsType) {
  const [row] = rows;
  const audioKey = getAudioKey(row);

  if (isInstructionRow(row)) {
    return buildInstructionTrial(mediaAssets.images[getImageKey(row)], () => audioKey);
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
