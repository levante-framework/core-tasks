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
  getFeedbackContent,
  getMediaKey,
  getRowPrompts,
  isFeedbackRow,
  isGuided,
  isInstructionRow,
  isPracticeRow,
  isTestRow,
} from './utils';

// guided practice shows the cursor
const REQUIRED_IMAGES = ['cursor'];
// Prompts need both audio and a translation. The fallback's message comes from shared/trials/repeatInstructions.
const REQUIRED_PROMPTS = ['generalRepeatInstructions'];
const REQUIRED_TEXT = ['continueButtonText'];

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

  // Correct feedback is always a feedback screen. Incorrect feedback is a screen in the standard flow, but in
  // the heavy flow (downex rows) it's the cue for one retry of the input trial, so it takes one prompt and no image.
  const isHeavyFlow = keyPrefix === 'downex:';
  const incorrectIds = new Set(trialRows.map((row) => row.feedbackItemIds?.[1]).filter(Boolean));
  for (const row of feedbackRows) {
    const errorKey = `${keyPrefix}feedback:${row.itemId}`;
    const error =
      feedbackRows.filter((other) => other.itemId === row.itemId).length > 1
        ? 'more than one feedback row with this item_id'
        : getFeedbackRowError(row, isHeavyFlow && incorrectIds.has(row.itemId), mediaAssets, translations);
    if (error) errors[errorKey] = error;
  }
  for (const row of trialRows) {
    const error = getRowError(row, mediaAssets, translations);
    // item_ids repeat across blocks, so include the block to tell rows apart
    if (error) errors[`${keyPrefix}${row.block_index}:${row.itemId}`] = error;
  }
  return errors;
}

function getFeedbackRowError(
  row: CorpusRow,
  isRetryCue: boolean,
  mediaAssets: MediaAssetsType,
  translations: Record<string, string>,
): string | null {
  const { prompts, image } = getFeedbackContent(row);
  if (!prompts.length) return 'missing audio_file';
  if (isRetryCue && prompts.length > 1) {
    return `heavy-instructions incorrect feedback is a retry cue, so it takes one audio_file, got "${row.audioFile}"`;
  }
  for (const prompt of prompts) {
    const missing = getMissingPromptAssets(prompt, mediaAssets, translations);
    if (missing.length) return `no ${missing.join(' or ')} for prompt "${prompt}"`;
  }
  if (isRetryCue) return null;
  if (!image) return 'feedback screens need an image';
  return image in mediaAssets.images ? null : `no image named "${row.image}"`;
}

/** An instruction row's single prompt: its audio and translation must exist. */
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
  if (!Array.isArray(row.audioFile) || row.audioFile.length !== 2) {
    return `audio_file must be "display,input" prompts, got "${row.audioFile ?? ''}"`;
  }
  const { display, input } = getRowPrompts(row);
  for (const prompt of [display, input].filter((key): key is string => Boolean(key))) {
    const missing = getMissingPromptAssets(resolveMemoryGamePrompt(prompt), mediaAssets, translations);
    if (missing.length) return `no ${missing.join(' or ')} for prompt "${prompt}"`;
  }
  return null;
}
