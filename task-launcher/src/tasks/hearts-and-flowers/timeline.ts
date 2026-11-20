import partition from 'lodash/partition';
// setup
import { taskStore } from '../../taskStore';
import { createPreloadTrials, initTimeline, initTrialSaving, reportCorpusValidationErrors } from '../shared/helpers';
import { withInputDeviceCondition } from '../shared/helpers/deviceVariants';
import { groupConsecutiveRows } from '../shared/helpers/groupConsecutiveRows';
// trials
import { enterFullscreen, exitFullscreen, taskFinished } from '../shared/trials';
import { jsPsych } from '../taskSetup';
import {
  BLOCK_STIMULUS_TYPE,
  BlockType,
  type CorpusRow,
  type FeedbackOutcome,
  getAudioKey,
  getButtonDemoSide,
  getFeedbackPromptKey,
  getImageKey,
  getInstructionPracticeSide,
  isFeedbackRow,
  isHfV2,
  isInstructionPracticeRow,
  isInstructionRow,
  type StimulusSideType,
} from './helpers/utils';
import { getCorpusValidationErrors } from './helpers/validation';
import { fixation } from './trials/fixation';
import { buildInstructionTrial } from './trials/instructions';
import { buildInstructionPracticeTrial, buildPracticeFeedback } from './trials/practice';
import { buildHeartsOrFlowersTimelineVariables, buildMixedTimelineVariables, stimulus } from './trials/stimulus';

const INTER_STIMULUS_INTERVAL = 500;
const PRACTICE_WIN_STREAK: Record<BlockType, number> = {
  [BlockType.Hearts]: 2,
  [BlockType.Flowers]: 2,
  [BlockType.Mixed]: 3,
};

export default function buildHeartsAndFlowersTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  initTrialSaving(config);
  const { heavyInstructions, corpora } = taskStore();
  const corpus: CorpusRow[] = heavyInstructions && isHfV2() ? corpora.downex : corpora.stimulus;
  taskStore('totalTestTrials', corpus.filter((row) => row.assessmentStage === 'test_response').length);

  const [feedbackRows, trialRows] = partition(corpus, isFeedbackRow);
  const groupedTrialRows = groupCorpusRows(trialRows);
  reportCorpusValidationErrors(
    getCorpusValidationErrors(groupedTrialRows, feedbackRows, mediaAssets, taskStore().translations),
  );

  const timeline = [
    createPreloadTrials(mediaAssets).default,
    initTimeline(config, enterFullscreen),
    ...groupedTrialRows.map((rows) => buildRowGroupSubTimeline(rows, mediaAssets, feedbackRows)),
    taskFinished(),
    exitFullscreen,
  ];

  return { jsPsych, timeline };
}

/**
 * Groups consecutive rows of the same block and kind: a run of instruction screens, of practice rows
 * in one direction, or of test rows in one direction.
 */
function groupCorpusRows(corpus: CorpusRow[]): CorpusRow[][] {
  return groupConsecutiveRows(
    corpus,
    (runStart, row) =>
      // Each practice instruction row gets its own group because it loops indefinitely until the child gets it right
      !isInstructionPracticeRow(row) &&
      !isInstructionPracticeRow(runStart) &&
      runStart.assessmentStage === row.assessmentStage &&
      runStart.block_index === row.block_index,
  );
}

function buildRowGroupSubTimeline(rows: CorpusRow[], mediaAssets: MediaAssetsType, feedbackRows: CorpusRow[]) {
  const [row] = rows;
  if (isInstructionRow(row)) {
    return {
      timeline: rows.map((instructionRow) => {
        const audioKey = getAudioKey(instructionRow);
        // A row with answer left/right is a button demo: it shows only that button and waits for a press
        const buttonSide = getButtonDemoSide(instructionRow) ?? null;
        const trial = buildInstructionTrial(
          mediaAssets.images[getImageKey(instructionRow)],
          () => audioKey,
          buttonSide !== null,
          buttonSide,
        );
        return withInputDeviceCondition(instructionRow.device, trial);
      }),
    };
  }
  if (isInstructionPracticeRow(row)) return buildInstructionPracticeSubTimeline(row, mediaAssets, feedbackRows);

  return row.assessmentStage === 'practice_response' ? buildPracticeBlock(rows, feedbackRows) : buildTestBlock(rows);
}

function buildInstructionPracticeSubTimeline(row: CorpusRow, mediaAssets: MediaAssetsType, feedbackRows: CorpusRow[]) {
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
      buildPracticeFeedback('correct', () => getFeedbackPromptKey(feedbackRows, row, 'correct', stimulusType)),
      buildPracticeFeedback('incorrect', () => getFeedbackPromptKey(feedbackRows, row, 'incorrect', stimulusType)),
    ],
    loop_function: () => taskStore().isCorrect === false,
  };
}

function buildPracticeBlock(rows: CorpusRow[], feedbackRows: CorpusRow[]) {
  const [row] = rows;
  const blockType = row.trialType as BlockType;

  let practiceWinStreakCount = 0;
  let currentRow = row;
  const onStimulusTrialFinishTimelineCallback = (data: Record<string, unknown>) => {
    practiceWinStreakCount = data.correct ? practiceWinStreakCount + 1 : 0;
    currentRow = jsPsych.timelineVariable('corpusRow');
  };
  const getPromptKey = (outcome: FeedbackOutcome) => () =>
    getFeedbackPromptKey(feedbackRows, currentRow, outcome, taskStore().stimulus);

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

function buildBlockTimelineVariables(rows: CorpusRow[]) {
  const blockType = rows[0].trialType as BlockType;
  const stimuliAndSides =
    blockType === BlockType.Mixed
      ? buildMixedTimelineVariables(rows.length)
      : buildHeartsOrFlowersTimelineVariables(rows.length, BLOCK_STIMULUS_TYPE[blockType]);
  return rows.map((row, i) => ({ ...stimuliAndSides[i], corpusRow: row }));
}
