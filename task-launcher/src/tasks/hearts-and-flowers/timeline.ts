import groupBy from 'lodash/groupBy';
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
  findFeedbackRow,
  getAudioKey,
  getImageKey,
  getInstructionPracticeSide,
  type HaFStimulusType,
  isFeedbackRow,
  isInstructionRow,
  isPracticeInstructionRow,
  type StimulusSideType,
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
import { buildInstructionPracticeTrial, buildPracticeFeedback } from './trials/practice';
import { buildHeartsOrFlowersTimelineVariables, buildMixedTimelineVariables, stimulus } from './trials/stimulus';

const INTER_STIMULUS_INTERVAL = 500;
const PRACTICE_WIN_STREAK: Record<BlockType, number> = {
  [BlockType.Hearts]: 2,
  [BlockType.Flowers]: 2,
  [BlockType.Mixed]: 3,
};
// The faster mixed blocks
const FASTER_MIXED_BLOCKS = [3, 4];

type FeedbackOutcome = 'correct' | 'incorrect';
/** The prompt to play after a practice answer with the given outcome and stimulus, or undefined for no feedback. */
type GetFeedbackPromptKey = (row: CorpusRow, outcome: FeedbackOutcome, stimulus: HaFStimulusType) => string | undefined;

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

  // Feedback rows aren't played in order; a practice row's feedback_item_ids name the feedback rows to play
  // after a correct and a wrong answer. Rows can share a feedback item_id, one for each stimulus.
  const feedbackRows = corpus.filter(isFeedbackRow);
  const feedbackRowsById = groupBy(feedbackRows, (row) => row.itemId);
  const getFeedbackPromptKey: GetFeedbackPromptKey = (row, outcome, stimulus) => {
    const feedbackItemId = row.feedbackItemIds?.[outcome === 'correct' ? 0 : 1];
    const feedbackRow = feedbackItemId ? findFeedbackRow(feedbackRowsById[feedbackItemId] ?? [], stimulus) : undefined;
    return feedbackRow && getAudioKey(feedbackRow);
  };

  const rowGroups = groupCorpusRows(corpus.filter((row) => !isFeedbackRow(row)));
  reportCorpusValidationErrors(
    getCorpusValidationErrors(rowGroups, feedbackRows, mediaAssets, taskStore().translations),
  );
  for (const rows of rowGroups) {
    timeline.push(buildRowsTimeline(rows, mediaAssets, getFeedbackPromptKey));
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

function buildRowsTimeline(
  rows: CorpusRow[],
  mediaAssets: MediaAssetsType,
  getFeedbackPromptKey: GetFeedbackPromptKey,
) {
  const [row] = rows;
  const audioKey = getAudioKey(row);

  if (isInstructionRow(row)) {
    return buildInstructionTrial(mediaAssets.images[getImageKey(row)], () => audioKey);
  }

  if (isPracticeInstructionRow(row)) {
    return buildPracticeInstructionBlock(row, mediaAssets, getFeedbackPromptKey);
  }

  return row.assessmentStage === 'practice_response'
    ? buildPracticeBlock(rows, getFeedbackPromptKey)
    : buildTestBlock(rows);
}

function buildPracticeInstructionBlock(
  row: CorpusRow,
  mediaAssets: MediaAssetsType,
  getFeedbackPromptKey: GetFeedbackPromptKey,
) {
  const audioKey = getAudioKey(row);
  const stimulusType = BLOCK_STIMULUS_TYPE[row.trialType];

  return {
    timeline: [
      buildInstructionPracticeTrial(
        stimulusType,
        taskStore().translations[audioKey],
        mediaAssets.audio[audioKey],
        // validation guarantees the row has a left or right answer
        getInstructionPracticeSide(row) as StimulusSideType,
        audioKey,
      ),
      buildPracticeFeedback('correct', () => getFeedbackPromptKey(row, 'correct', stimulusType)),
      buildPracticeFeedback('incorrect', () => getFeedbackPromptKey(row, 'incorrect', stimulusType)),
    ],
    loop_function: () => taskStore().isCorrect === false,
  };
}

/**
 * Each row is a stimulus followed by its feedback. Once the child gets the win streak in a row,
 * the trial's feedback still plays and the rest of the block is skipped.
 */
function buildPracticeBlock(rows: CorpusRow[], getFeedbackPromptKey: GetFeedbackPromptKey) {
  const [row] = rows;
  const blockType = row.trialType as BlockType;

  let practiceWinStreakCount = 0;
  let currentRow = row;
  const onStimulusTrialFinishTimelineCallback = (data: Record<string, unknown>) => {
    practiceWinStreakCount = data.correct ? practiceWinStreakCount + 1 : 0;
    currentRow = jsPsych.timelineVariable('corpusRow');
  };
  const getPromptKey = (outcome: FeedbackOutcome) => () =>
    getFeedbackPromptKey(currentRow, outcome, taskStore().stimulus);

  return {
    timeline: [
      {
        timeline: [
          fixation(INTER_STIMULUS_INTERVAL),
          stimulus(onStimulusTrialFinishTimelineCallback),
          buildPracticeFeedback('correct', getPromptKey('correct')),
          buildPracticeFeedback('incorrect', getPromptKey('incorrect')),
        ],
        conditional_function: () => practiceWinStreakCount < PRACTICE_WIN_STREAK[blockType],
      },
    ],
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
