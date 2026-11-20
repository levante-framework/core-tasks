import { camelize } from '../../shared/helpers';

type ValueOf<T> = T[keyof T];

/**
 * The corpus fields memory game reads (see shared/helpers/getCorpus.ts). Each row is one instruction
 * screen, one feedback prompt, or one sequence (a display trial then an input trial), in play order.
 * - audioFile: an instruction or feedback prompt, or a sequence's "display,input" prompts (blank uses the defaults)
 * - image: an instruction screen's image or video; "cursor" on a heavy-instructions practice row makes it guided
 * - item: a sequence's fixed length (blank on test rows uses the adaptive length)
 */
export type CorpusRow = Pick<
  StimulusType,
  | 'itemId'
  | 'block_index'
  | 'assessmentStage'
  | 'trialType'
  | 'audioFile'
  | 'image'
  | 'item'
  | 'downex'
  | 'feedbackItemIds'
>;

export type FeedbackPrompts = { correct?: string; incorrect?: string };

export const Direction = {
  Forward: 'forward',
  Backward: 'backward',
} as const;
export type Direction = ValueOf<typeof Direction>;

export const isInstructionRow = (row: CorpusRow) => row.assessmentStage === 'instructions';
export const isFeedbackRow = (row: CorpusRow) => row.assessmentStage === 'feedback';
export const isPracticeRow = (row: CorpusRow) => row.assessmentStage === 'practice_response';
export const isTestRow = (row: CorpusRow) => row.assessmentStage === 'test_response';
export const isBackward = (row: CorpusRow) => row.trialType === Direction.Backward;

/** The camelCase key of a single-file audio_file (instruction and feedback prompts). */
export function getAudioKey(row: CorpusRow) {
  return camelize(String(row.audioFile ?? '').trim());
}

export function getMediaKey(row: CorpusRow) {
  return camelize(String(row.image ?? '').trim());
}

/** A sequence row's display and input prompts, or undefined to use the default prompts. */
export function getRowPrompts(row: CorpusRow) {
  const [display, input] = Array.isArray(row.audioFile) ? row.audioFile.map((key) => camelize(key.trim())) : [];
  return { display, input };
}

/** Guided practice rows show the cursor image on the next block to press, with the other blocks disabled. */
export function isGuided(row: CorpusRow) {
  return getMediaKey(row) === 'cursor';
}

/** The row's fixed sequence length, or undefined to use the current adaptive length. */
export function getFixedSequenceLength(row: CorpusRow) {
  return row.item ? Number(row.item) : undefined;
}

/**
 * The prompts to play after a practice row's correct and wrong answers. A practice row's
 * feedback_item_ids ("correct,incorrect") name feedback rows in the same corpus; either can be blank.
 */
export function getFeedbackPrompts(feedbackRows: CorpusRow[], row: CorpusRow): FeedbackPrompts {
  const [correctId, incorrectId] = row.feedbackItemIds ?? [];
  const getPrompt = (itemId?: string) => {
    const feedbackRow = itemId ? feedbackRows.find((candidate) => candidate.itemId === itemId) : undefined;
    return feedbackRow && getAudioKey(feedbackRow);
  };
  return { correct: getPrompt(correctId), incorrect: getPrompt(incorrectId) };
}
