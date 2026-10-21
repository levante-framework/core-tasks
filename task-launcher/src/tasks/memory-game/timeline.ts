import { mediaAssets } from '../..';
import { taskStore } from '../../taskStore';
import {
  camelize,
  checkFallbackCriteria,
  createPreloadTrials,
  initTimeline,
  initTrialSaving,
  reportCorpusValidationErrors,
} from '../shared/helpers';
// trials
import { enterFullscreen, exitFullscreen, feedback, repeatInstructionsMessage, taskFinished } from '../shared/trials';
// setup
import { initializeCat, jsPsych } from '../taskSetup';
import { resolveMemoryGamePrompt } from './helpers/resolveMemoryGamePrompt';
import { type CorpusRow, Direction, type FeedbackPrompts } from './helpers/utils';
import { buildInstructionScreen } from './trials/instructions';
import { getCorsiBlocks } from './trials/stimulus';

const FALLBACK_CHECK_TRIALS = 4;

export default function buildMemoryTimeline(config: Record<string, any>) {
  const { heavyInstructions } = taskStore();

  initTrialSaving(config);
  const preloadTrials = createPreloadTrials(mediaAssets).default;
  const initialTimeline = initTimeline(config, enterFullscreen);

  const mainRows: CorpusRow[] = taskStore().corpora.stimulus;
  const downexRows: CorpusRow[] = taskStore().corpora.downex;

  const validationErrorMap: Record<string, string> = {};
  const isValid = (row: CorpusRow) => {
    const error = getRowError(row);
    if (error) {
      validationErrorMap[`${row.downex ? 'downex:' : ''}${row.block_index}:${row.itemId}`] = error;
    }
    return !error;
  };
  const isFeedback = (row: CorpusRow) => row.assessmentStage === 'feedback';
  const validMainRows = mainRows.filter((row) => !isFeedback(row) && isValid(row));
  const validDownexRows = downexRows.filter((row) => !isFeedback(row) && isValid(row));
  // Feedback rows aren't played in order; a practice row's feedback_item_ids name the feedback rows
  // in the same corpus to play after a correct and a wrong answer
  const getFeedbackPromptsById = (rows: CorpusRow[], playableRows: CorpusRow[], corpusName: string) => {
    const prompts: Record<string, string> = {};
    rows
      .filter(isFeedback)
      .filter(isValid)
      .forEach((row) => {
        if (row.itemId in prompts) {
          validationErrorMap[`${corpusName}feedback:${row.itemId}`] = 'more than one feedback row with this item_id';
        }
        prompts[row.itemId] = camelize(String(row.audioFile).trim());
      });
    const [correctIds, incorrectIds] = [new Set<string>(), new Set<string>()];
    playableRows.forEach((row) => {
      const [correctId, incorrectId] = row.feedbackItemIds ?? [];
      if (correctId) correctIds.add(correctId);
      if (incorrectId) incorrectIds.add(incorrectId);
      const missingIds = [correctId, incorrectId].filter((id) => id && !(id in prompts));
      if (missingIds.length) {
        validationErrorMap[`${corpusName}${row.block_index}:${row.itemId}`] =
          `no feedback row with item_id ${missingIds.map((id) => `"${id}"`).join(' or ')}`;
      }
    });
    Object.keys(prompts).forEach((itemId) => {
      if (!correctIds.has(itemId) && !incorrectIds.has(itemId)) {
        validationErrorMap[`${corpusName}feedback:${itemId}`] = 'no practice row has this item_id in feedback_item_ids';
      } else if (correctIds.has(itemId) && incorrectIds.has(itemId)) {
        validationErrorMap[`${corpusName}feedback:${itemId}`] = 'used as both correct and incorrect feedback';
      }
    });
    return prompts;
  };
  const mainFeedbackPrompts = getFeedbackPromptsById(mainRows, validMainRows, '');
  const downexFeedbackPrompts = getFeedbackPromptsById(downexRows, validDownexRows, 'downex:');

  // For each block, the heavy flow uses its downex rows when it has any, and the main rows otherwise
  const blockIndexes = [...new Set([...validMainRows, ...validDownexRows].map((row) => row.block_index))].sort(
    (a, b) => a - b,
  );
  const blocks = blockIndexes.map((blockIndex) => {
    const blockDownexRows = validDownexRows.filter((row) => row.block_index === blockIndex);
    const useDownex = heavyInstructions && blockDownexRows.length > 0;
    const rows = useDownex ? blockDownexRows : validMainRows.filter((row) => row.block_index === blockIndex);
    return { rows, useDownex };
  });
  const playedRows = blocks.flatMap((block) => block.rows);

  const forwardTestRows = playedRows.filter(
    (row) => row.assessmentStage === 'test_response' && row.trialType === Direction.Forward,
  );
  const testTrialCount = playedRows.filter((row) => row.assessmentStage === 'test_response').length;
  taskStore('forwardTestTrialCount', forwardTestRows.length);
  taskStore('totalTestTrials', testTrialCount);
  if (!testTrialCount) {
    validationErrorMap.corpus = 'no test rows; the corpus is missing or failed to load';
  }

  const displayPromptKeys = getDisplayPromptKeys([...validMainRows, ...validDownexRows]);

  // Switches to the heavy-instructions flow and replays its forward practice, at most once,
  // if the child struggles on the first forward test trials
  let fellBack = false;
  const heavyForwardPractice = getHeavyForwardPracticeRows(validDownexRows);
  if (!heavyForwardPractice.length) {
    validationErrorMap.fallback = 'no downex forward practice rows to replay on fallback';
  }
  const fallbackBlock = {
    timeline: [repeatInstructionsMessage, ...buildRowsTimeline(heavyForwardPractice, true)],
    conditional_function: () => {
      const run = heavyForwardPractice.length > 0 && checkFallbackCriteria(true) && !fellBack;
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

  function buildRowsTimeline(rows: CorpusRow[], isHeavyFlow: boolean) {
    const blockTimeline: unknown[] = [];
    const feedbackPrompts = isHeavyFlow ? downexFeedbackPrompts : mainFeedbackPrompts;
    const getRowFeedback = (row: CorpusRow): FeedbackPrompts => {
      const [correctId, incorrectId] = row.feedbackItemIds ?? [];
      return {
        correct: correctId ? feedbackPrompts[correctId] : undefined,
        incorrect: incorrectId ? feedbackPrompts[incorrectId] : undefined,
      };
    };

    rows.forEach((row, i) => {
      if (row.assessmentStage === 'instructions') {
        blockTimeline.push(
          buildInstructionScreen(camelize(String(row.audioFile)), camelize(String(row.image)), displayPromptKeys),
        );
        return;
      }

      if (row.assessmentStage === 'test_response') {
        blockTimeline.push(...buildTestTrial(row, forwardTestRows.indexOf(row), forwardTestRows.length, fallbackBlock));
        return;
      }

      if (isHeavyFlow) {
        blockTimeline.push(buildHeavyPracticeTrial(row, isGuided(row), getRowFeedback(row)));
        return;
      }

      // default practice: build the whole run of consecutive practice rows at once, so it can be repeated
      const previousRow = rows[i - 1];
      if (previousRow?.assessmentStage === 'practice_response' && previousRow.trialType === row.trialType) {
        return;
      }
      const practiceRows = [row];
      for (
        let j = i + 1;
        rows[j]?.assessmentStage === 'practice_response' && rows[j].trialType === row.trialType;
        j++
      ) {
        practiceRows.push(rows[j]);
      }
      blockTimeline.push(...buildDefaultPractice(practiceRows, getRowFeedback));
    });

    return blockTimeline;
  }

  const blocksTimeline = blocks.flatMap((block) => buildRowsTimeline(block.rows, block.useDownex));

  reportCorpusValidationErrors(validationErrorMap);

  const timeline: any[] = [preloadTrials, initialTimeline, ...blocksTimeline, taskFinished()];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}

function getRowError(row: CorpusRow): string | null {
  if (row.feedbackItemIds && row.assessmentStage !== 'practice_response') {
    return 'only practice rows can have feedback_item_ids';
  }
  if (row.feedbackItemIds && row.feedbackItemIds.length !== 2) {
    return `feedback_item_ids must be "correct,incorrect" item_ids (either can be blank), got "${row.feedbackItemIds}"`;
  }
  if (row.assessmentStage === 'instructions') {
    if (!row.audioFile) return 'missing audio_file';
    if (Array.isArray(row.audioFile)) return `instruction screens take one audio_file, got "${row.audioFile}"`;
    const mediaKey = camelize(String(row.image ?? ''));
    if (!(mediaKey in mediaAssets.images) && !(mediaKey in mediaAssets.video)) {
      return `no image or video named "${row.image}"`;
    }
    return null;
  }
  if (
    row.assessmentStage !== 'practice_response' &&
    row.assessmentStage !== 'test_response' &&
    row.assessmentStage !== 'feedback'
  ) {
    return `unknown assessment_stage "${row.assessmentStage}"`;
  }
  if (row.trialType !== Direction.Forward && row.trialType !== Direction.Backward) {
    return `unknown trial_type "${row.trialType}"`;
  }
  if (row.assessmentStage === 'feedback') {
    if (!row.audioFile) return 'missing audio_file';
    if (Array.isArray(row.audioFile)) return `feedback rows take one audio_file, got "${row.audioFile}"`;
    return null;
  }
  if (isGuided(row) && (row.assessmentStage !== 'practice_response' || !row.downex)) {
    return 'only downex practice rows can be guided (image "cursor")';
  }
  if (row.item && !(Number.isInteger(Number(row.item)) && Number(row.item) > 0)) {
    return `invalid sequence length in item "${row.item}"`;
  }
  if (row.audioFile && (!Array.isArray(row.audioFile) || row.audioFile.length !== 2)) {
    return `audio_file must be blank or "display,input" prompts, got "${row.audioFile}"`;
  }
  return null;
}

/** The row's display and input prompts, or undefined to use the default prompts. */
function getRowPrompts(row: CorpusRow) {
  const [display, input] = Array.isArray(row.audioFile) ? row.audioFile.map((key) => camelize(key.trim())) : [];
  return { display, input };
}

/** Guided practice rows show the cursor image on the next block to press, with the other blocks disabled. */
function isGuided(row: CorpusRow) {
  return camelize(String(row.image ?? '')) === 'cursor';
}

/** The row's fixed sequence length, or undefined to use the current adaptive length. */
function getFixedSequenceLength(row: CorpusRow) {
  return row.item ? Number(row.item) : undefined;
}

/** Prompts that can play before a display trial, so their durations can be measured ahead of time. */
function getDisplayPromptKeys(rows: CorpusRow[]) {
  const defaults = ['memoryGameInstruct7Downex', 'memoryGameDisplay'];
  const fromRows = rows.map((row) => getRowPrompts(row).display).filter((key): key is string => Boolean(key));
  return [...new Set([...defaults, ...fromRows].map(resolveMemoryGamePrompt))];
}

/** The heavy forward practice section, starting at its first practice trial, to replay on fallback. */
function getHeavyForwardPracticeRows(downexRows: CorpusRow[]) {
  const isForwardPractice = (row: CorpusRow) =>
    row.assessmentStage === 'practice_response' && row.trialType === Direction.Forward;
  const firstPracticeRow = downexRows.find(isForwardPractice);
  if (!firstPracticeRow) return [];
  const blockRows = downexRows.filter((row) => row.block_index === firstPracticeRow.block_index);
  return blockRows.slice(blockRows.indexOf(firstPracticeRow));
}

function buildTestTrial(
  row: CorpusRow,
  forwardIndex: number,
  forwardCount: number,
  fallbackBlock: Record<string, unknown>,
) {
  const reverse = row.trialType === Direction.Backward;
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
  const isLastForward = forwardIndex === forwardCount - 1;
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

function buildDefaultPractice(rows: CorpusRow[], getRowFeedback: (row: CorpusRow) => FeedbackPrompts) {
  const buildPracticeTrial = (row: CorpusRow, feedbackOnlyIfCorrect: boolean) => {
    const reverse = row.trialType === Direction.Backward;
    const { display, input } = getRowPrompts(row);
    const customSeqLength = getFixedSequenceLength(row);
    const { correct, incorrect } = getRowFeedback(row);
    const correctFeedback = {
      timeline: [feedback(true, undefined, correct)],
      conditional_function: () => taskStore().isCorrect,
    };
    const incorrectFeedback = {
      timeline: [feedback(true, incorrect && resolveMemoryGamePrompt(incorrect))],
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

function buildHeavyPracticeTrial(row: CorpusRow, showCursorHint: boolean, feedbackPrompts: FeedbackPrompts) {
  const { correct, incorrect } = feedbackPrompts;
  const reverse = row.trialType === Direction.Backward;
  const { display, input } = getRowPrompts(row);
  const customSeqLength = getFixedSequenceLength(row);
  const sequenceTrials = [
    getCorsiBlocks({ reverse, mode: 'display', isPractice: true, customSeqLength, prompt: display }),
    getCorsiBlocks({
      reverse,
      mode: 'input',
      isPractice: true,
      animation: showCursorHint ? 'cursor' : undefined,
      prompt: input,
    }),
  ];
  const correctFeedback = {
    timeline: [feedback(true, undefined, correct)],
    conditional_function: () => taskStore().isCorrect,
  };
  const retry = {
    timeline: [
      getCorsiBlocks({
        reverse,
        mode: 'input',
        isPractice: true,
        animation: 'pulse',
        prompt: incorrect,
      }),
    ],
    conditional_function: () => !taskStore().isCorrect,
  };

  return {
    timeline: [...sequenceTrials, ...(correct ? [correctFeedback] : []), ...(incorrect ? [retry] : [])],
  };
}
