import partition from 'lodash/partition';
import { mediaAssets } from '../..';
import { taskStore } from '../../taskStore';
import {
  checkFallbackCriteria,
  createPreloadTrials,
  initTimeline,
  initTrialSaving,
  reportCorpusValidationErrors,
} from '../shared/helpers';
import { groupConsecutiveRows } from '../shared/helpers/groupConsecutiveRows';
// trials
import { enterFullscreen, exitFullscreen, feedback, repeatInstructionsMessage, taskFinished } from '../shared/trials';
// setup
import { initializeCat, jsPsych } from '../taskSetup';
import { resolveMemoryGamePrompt } from './helpers/resolveMemoryGamePrompt';
import {
  type CorpusRow,
  Direction,
  getAudioKey,
  getFixedSequenceLength,
  getMediaKey,
  getRowFeedback,
  getRowPrompts,
  isBackward,
  isFeedbackRow,
  isGuided,
  isInstructionRow,
  isPracticeRow,
  isTestRow,
  type RowFeedback,
} from './helpers/utils';
import { getCorpusValidationErrors } from './helpers/validation';
import { buildInstructionScreen as buildInstructionTrial, resetDisplayPromptDurations } from './trials/instructions';
import { getCorsiBlocks, resetMemoryGameState } from './trials/stimulus';

const FALLBACK_CHECK_TRIALS = 4;

type BuildContext = {
  // heavy-instructions flow: guided practice rows and a retry instead of incorrect feedback
  isHeavyFlow: boolean;
  feedbackRows: CorpusRow[];
  forwardTestRows: CorpusRow[];
  fallbackBlock: Record<string, unknown>;
  displayPromptKeys: string[];
};

export default function buildMemoryGameTimeline(config: Record<string, any>) {
  resetMemoryGameState();
  resetDisplayPromptDurations();
  initTrialSaving(config);
  const { heavyInstructions, corpora } = taskStore();
  const standardRows: CorpusRow[] = corpora.stimulus;
  const downexRows: CorpusRow[] = corpora.downex;
  reportCorpusValidationErrors(
    getCorpusValidationErrors({ standard: standardRows, downex: downexRows }, mediaAssets, taskStore().translations),
  );

  const [feedbackRows, trialRows] = partition(heavyInstructions ? downexRows : standardRows, isFeedbackRow);
  const [downexFeedbackRows, downexTrialRows] = partition(downexRows, isFeedbackRow);
  const forwardTestRows = trialRows.filter((row) => isTestRow(row) && !isBackward(row));
  taskStore('forwardTestTrialCount', forwardTestRows.length);
  taskStore('totalTestTrials', trialRows.filter(isTestRow).length);

  const displayPromptKeys = getDisplayPromptKeys([...trialRows, ...downexTrialRows]);

  // Switches to the heavy-instructions flow and replays its forward practice, at most once,
  // if the child struggles on the first forward test trials
  let fellBack = false;
  const fallbackContext: BuildContext = {
    isHeavyFlow: true,
    feedbackRows: downexFeedbackRows,
    forwardTestRows,
    fallbackBlock: {},
    displayPromptKeys,
  };
  const fallbackBlock = {
    timeline: [
      repeatInstructionsMessage,
      ...groupCorpusRows(getHeavyForwardPracticeRows(downexTrialRows)).flatMap((rows) =>
        buildRowGroupSubTimeline(rows, fallbackContext),
      ),
    ],
    conditional_function: () => {
      const run = checkFallbackCriteria(true) && !fellBack;
      if (run) {
        fellBack = true;
        taskStore('heavyInstructions', true);
        taskStore('gridSize', 2);
        taskStore('numOfBlocks', 4);
        taskStore('blockSize', 50);
      }
      return run;
    },
  };

  const context: BuildContext = {
    isHeavyFlow: Boolean(heavyInstructions),
    feedbackRows,
    forwardTestRows,
    fallbackBlock,
    displayPromptKeys,
  };

  const timeline = [
    createPreloadTrials(mediaAssets).default,
    initTimeline(config, enterFullscreen),
    ...groupCorpusRows(trialRows).flatMap((rows) => buildRowGroupSubTimeline(rows, context)),
    taskFinished(),
    exitFullscreen,
  ];

  initializeCat();

  return { jsPsych, timeline };
}

/**
 * Groups consecutive rows of the same block and kind: a run of instruction screens, of practice rows
 * in one direction, or of test rows in one direction.
 */
function groupCorpusRows(rows: CorpusRow[]) {
  return groupConsecutiveRows(
    rows,
    (runStart, row) =>
      runStart.block_index === row.block_index &&
      runStart.assessmentStage === row.assessmentStage &&
      (isInstructionRow(row) || runStart.trialType === row.trialType),
  );
}

function buildRowGroupSubTimeline(rows: CorpusRow[], context: BuildContext): unknown[] {
  const [row] = rows;
  if (isInstructionRow(row)) {
    return rows.map((instructionRow) =>
      buildInstructionTrial(getAudioKey(instructionRow), getMediaKey(instructionRow), context.displayPromptKeys),
    );
  } else if (isTestRow(row)) {
    return rows.flatMap((testRow) => buildTestTrial(testRow, context));
  }
  // practice
  else {
    return context.isHeavyFlow
      ? rows.map((practiceRow) =>
          buildHeavyPracticeTrial(practiceRow, getRowFeedback(context.feedbackRows, practiceRow)),
        )
      : buildStandardPracticeTrial(rows, (practiceRow) => getRowFeedback(context.feedbackRows, practiceRow));
  }
}

/** Prompts that play before a display trial, so their durations can be measured ahead of time. */
function getDisplayPromptKeys(rows: CorpusRow[]) {
  const displayPrompts = rows.map((row) => getRowPrompts(row).display).filter((key): key is string => Boolean(key));
  return [...new Set(displayPrompts.map(resolveMemoryGamePrompt))];
}

/** The heavy forward practice section, from its first practice trial to the end of its block, to replay on fallback. */
function getHeavyForwardPracticeRows(downexTrialRows: CorpusRow[]) {
  const firstPracticeRow = downexTrialRows.find((row) => isPracticeRow(row) && row.trialType === Direction.Forward);
  if (!firstPracticeRow) return [];
  const blockRows = downexTrialRows.filter((row) => row.block_index === firstPracticeRow.block_index);
  return blockRows.slice(blockRows.indexOf(firstPracticeRow));
}

function buildTestTrial(row: CorpusRow, { forwardTestRows, fallbackBlock }: BuildContext) {
  const reverse = isBackward(row);
  const { display, input } = getRowPrompts(row);

  if (reverse) {
    return [
      {
        timeline: [
          getCorsiBlocks({ mode: 'display', reverse, prompt: display }),
          getCorsiBlocks({ mode: 'input', reverse, prompt: input }),
        ],
      },
    ];
  }

  // the last forward trial resets the sequence length and error count for the backward phase
  const forwardIndex = forwardTestRows.indexOf(row);
  const isLastForward = forwardIndex === forwardTestRows.length - 1;
  const forwardTrial = {
    timeline: [
      getCorsiBlocks({ mode: 'display', prompt: display }),
      getCorsiBlocks({ mode: 'input', prompt: input, resetSeq: isLastForward }),
    ],
    conditional_function: () => {
      const result = taskStore().numIncorrect < taskStore().maxIncorrect;

      if (isLastForward) {
        taskStore('numIncorrect', 0); // reset to 0 here so that reverse block isn't skipped
      }

      return result;
    },
  };

  return forwardIndex < FALLBACK_CHECK_TRIALS ? [forwardTrial, fallbackBlock] : [forwardTrial];
}

/** Default practice plays the run of rows, then plays it once more if the last answer was wrong. */
function buildStandardPracticeTrial(rows: CorpusRow[], getFeedback: (row: CorpusRow) => RowFeedback) {
  const buildPracticeTrial = (row: CorpusRow, feedbackOnlyIfCorrect: boolean) => {
    const reverse = isBackward(row);
    const { display, input } = getRowPrompts(row);
    const customSeqLength = getFixedSequenceLength(row);
    const { correct, incorrect } = getFeedback(row);
    const correctFeedback = {
      timeline: [feedback(true, undefined, undefined, { correct })],
      conditional_function: () => taskStore().isCorrect,
    };
    const incorrectFeedback = {
      timeline: [feedback(true, undefined, undefined, { incorrect })],
      conditional_function: () => !taskStore().isCorrect,
    };

    return [
      getCorsiBlocks({ mode: 'display', isPractice: true, reverse, customSeqLength, prompt: display }),
      getCorsiBlocks({ mode: 'input', isPractice: true, reverse, prompt: input }),
      ...(correct ? [correctFeedback] : []),
      ...(incorrect && !feedbackOnlyIfCorrect ? [incorrectFeedback] : []),
    ];
  };

  return [
    ...rows.flatMap((row) => buildPracticeTrial(row, false)),
    {
      timeline: rows.flatMap((row, i) => buildPracticeTrial(row, i === rows.length - 1)),
      conditional_function: () => !taskStore().isCorrect,
    },
  ];
}

/** A heavy-instructions practice row: guided rows show the cursor hint, and a wrong answer gets one pulsing retry. */
function buildHeavyPracticeTrial(row: CorpusRow, { correct, incorrect }: RowFeedback) {
  const reverse = isBackward(row);
  const { display, input } = getRowPrompts(row);
  const customSeqLength = getFixedSequenceLength(row);
  const sequenceTrials = [
    getCorsiBlocks({ reverse, mode: 'display', isPractice: true, customSeqLength, prompt: display }),
    getCorsiBlocks({
      reverse,
      mode: 'input',
      isPractice: true,
      animation: isGuided(row) ? 'cursor' : undefined,
      prompt: input,
    }),
  ];
  const correctFeedback = {
    timeline: [feedback(true, undefined, undefined, { correct })],
    conditional_function: () => taskStore().isCorrect,
  };
  // a wrong answer gets no feedback screen: the input trial replays once, cued by the incorrect row's prompt
  const retry = {
    timeline: [
      getCorsiBlocks({ reverse, mode: 'input', isPractice: true, animation: 'pulse', prompt: incorrect?.prompts[0] }),
    ],
    conditional_function: () => !taskStore().isCorrect,
  };

  return {
    timeline: [...sequenceTrials, ...(correct ? [correctFeedback] : []), ...(incorrect ? [retry] : [])],
  };
}
