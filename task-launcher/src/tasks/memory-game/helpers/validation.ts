import partition from 'lodash/partition';
import {
  getBlockIndexErrors,
  getFeedbackLinkErrors,
  getMissingPromptAssets,
} from '../../shared/helpers/corpusValidation';
import { resolveMemoryGamePrompt } from './resolveMemoryGamePrompt';
import {
  type CorpusRow,
  Direction,
  getAudioKey,
  getMediaKey,
  getRowPrompts,
  isFeedbackRow,
  isGuided,
  isInstructionRow,
  isPracticeRow,
  isTestRow,
} from './utils';

// Assets used by trials that don't come from a corpus row
const REQUIRED_IMAGES = ['smilingFace@2x', 'sadFace@2x', 'cursor'];
// Prompts need both audio and a translation. Default sequence prompts (see getMemoryGamePrompt) are
// resolved like at play time, and the fallback's message comes from shared/trials/repeatInstructions.
const REQUIRED_PROMPTS = [
  'memoryGameDisplay',
  'memoryGameInstruct7Downex',
  'memoryGameInstruct8Downex',
  'memoryGameInstruct11Downex',
  'feedbackNotQuiteRight',
  'generalRepeatInstructions',
];
const REQUIRED_TEXT = ['continueButtonText'];

/**
 * Describes everything that would stop the task from running as intended: invalid corpus rows and
 * missing images, video, audio or translations. Pass the result to reportCorpusValidationErrors.
 *
 * Both corpora are checked on every run: the default flow can fall back to the heavy-instructions
 * practice mid-run, so it plays downex rows too.
 */
export function getCorpusValidationErrors(
  corpora: { standard: CorpusRow[]; downex: CorpusRow[] },
  mediaAssets: MediaAssetsType,
  translations: Record<string, string>,
) {
  const errors: Record<string, string> = {
    ...getFixedAssetErrors(mediaAssets, translations),
    ...getCorpusErrors(corpora.standard, '', mediaAssets, translations),
    ...getCorpusErrors(corpora.downex, 'downex:', mediaAssets, translations),
  };
  if (!corpora.standard.some(isTestRow)) {
    errors.corpus = 'no test rows; the corpus is missing or failed to load';
  }
  if (!corpora.downex.some((row) => isPracticeRow(row) && row.trialType === Direction.Forward)) {
    errors.fallback = 'no downex forward practice rows to replay on fallback';
  }
  return errors;
}

function getFixedAssetErrors(mediaAssets: MediaAssetsType, translations: Record<string, string>) {
  const errors: Record<string, string> = {};
  for (const key of REQUIRED_IMAGES) {
    if (!mediaAssets.images[key]) errors[`image:${key}`] = 'missing image';
  }
  for (const key of REQUIRED_PROMPTS) {
    const missing = getMissingPromptAssets(resolveMemoryGamePrompt(key), mediaAssets, translations);
    if (missing.length) errors[`prompt:${key}`] = `missing ${missing.join(' and ')}`;
  }
  for (const key of REQUIRED_TEXT) {
    if (!translations[key]) errors[`text:${key}`] = 'missing translation';
  }
  return errors;
}

function getCorpusErrors(
  rows: CorpusRow[],
  keyPrefix: string,
  mediaAssets: MediaAssetsType,
  translations: Record<string, string>,
) {
  const [feedbackRows, trialRows] = partition(rows, isFeedbackRow);
  const feedbackIds = new Set(feedbackRows.map((row) => row.itemId));
  const errors: Record<string, string> = {
    ...getBlockIndexErrors(trialRows, keyPrefix),
    ...getFeedbackLinkErrors(trialRows, feedbackIds, {
      canHaveFeedback: isPracticeRow,
      getMissingFeedback: (itemId) => (feedbackIds.has(itemId) ? null : `no feedback row with item_id "${itemId}"`),
      keyPrefix,
    }),
  };

  for (const row of feedbackRows) {
    const error = getPromptError(row, mediaAssets, translations, 'feedback rows');
    const errorKey = `${keyPrefix}feedback:${row.itemId}`;
    if (feedbackRows.filter((other) => other.itemId === row.itemId).length > 1) {
      errors[errorKey] = 'more than one feedback row with this item_id';
    } else if (error) {
      errors[errorKey] = error;
    }
  }
  for (const row of trialRows) {
    const error = getRowError(row, mediaAssets, translations);
    // item_ids repeat across blocks, so include the block to tell rows apart
    if (error) errors[`${keyPrefix}${row.block_index}:${row.itemId}`] = error;
  }
  return errors;
}

/** An instruction or feedback row's single prompt: its audio and translation must exist. */
function getPromptError(
  row: CorpusRow,
  mediaAssets: MediaAssetsType,
  translations: Record<string, string>,
  rowKind: string,
): string | null {
  if (!getAudioKey(row) || Array.isArray(row.audioFile)) {
    return `${rowKind} take one audio_file, got "${row.audioFile ?? ''}"`;
  }
  const missing = getMissingPromptAssets(resolveMemoryGamePrompt(getAudioKey(row)), mediaAssets, translations);
  return missing.length ? `no ${missing.join(' or ')} for audio_file "${row.audioFile}"` : null;
}

function getRowError(
  row: CorpusRow,
  mediaAssets: MediaAssetsType,
  translations: Record<string, string>,
): string | null {
  if (isInstructionRow(row)) {
    const promptError = getPromptError(row, mediaAssets, translations, 'instruction screens');
    if (promptError) return promptError;
    const mediaKey = getMediaKey(row);
    return mediaKey in mediaAssets.images || mediaKey in mediaAssets.video
      ? null
      : `no image or video named "${row.image}"`;
  }

  if (!isPracticeRow(row) && !isTestRow(row)) {
    return `unknown assessment_stage "${row.assessmentStage}"`;
  }
  if (row.trialType !== Direction.Forward && row.trialType !== Direction.Backward) {
    return `unknown trial_type "${row.trialType}"`;
  }
  if (isGuided(row) && (!isPracticeRow(row) || !row.downex)) {
    return 'only downex practice rows can be guided (image "cursor")';
  }
  // Practice always uses a fixed length; an adaptive one would carry over the length the previous block reached
  if (isPracticeRow(row) && !row.item) {
    return 'practice rows need a fixed sequence length in item';
  }
  if (row.item && !(Number.isInteger(Number(row.item)) && Number(row.item) > 0)) {
    return `invalid sequence length in item "${row.item}"`;
  }
  if (row.audioFile && (!Array.isArray(row.audioFile) || row.audioFile.length !== 2)) {
    return `audio_file must be blank or "display,input" prompts, got "${row.audioFile}"`;
  }
  const { display, input } = getRowPrompts(row);
  for (const prompt of [display, input].filter((key): key is string => Boolean(key))) {
    const missing = getMissingPromptAssets(resolveMemoryGamePrompt(prompt), mediaAssets, translations);
    if (missing.length) return `no ${missing.join(' or ')} for prompt "${prompt}"`;
  }
  return null;
}
