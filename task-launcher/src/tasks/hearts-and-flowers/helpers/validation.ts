import groupBy from 'lodash/groupBy';
import { getInputDeviceVariant, getInputDeviceVariantErrors } from '../../shared/helpers/deviceVariants';
import {
  BLOCK_STIMULUS_TYPE,
  BlockType,
  type CorpusRow,
  findFeedbackRow,
  getAudioKey,
  getButtonDemoSide,
  getImageKey,
  getInstructionPracticeSide,
  getRowStimuli,
  HaFStimulusType,
  isInstructionPracticeRow,
  isInstructionRow,
} from './utils';

// Assets used by trials that don't come from a corpus row
const REQUIRED_IMAGES = [HaFStimulusType.Heart, HaFStimulusType.Flower, 'smilingFace'];
const REQUIRED_TEXT = ['continueButtonText', 'heartsAndFlowersPressAnyKey'];
// played when a button demo's button is pressed
const REQUIRED_SOUNDS = ['coin'];

/**
 * Describes everything that would stop the task from running as intended: invalid corpus rows and
 * missing images, audio or translations. Pass the result to reportCorpusValidationErrors.
 */
export function getCorpusValidationErrors(
  rowGroups: CorpusRow[][],
  feedbackRows: CorpusRow[],
  mediaAssets: MediaAssetsType,
  translations: Record<string, string>,
) {
  const errors = {
    ...getFixedAssetErrors(mediaAssets, translations),
    ...getFeedbackErrors(rowGroups.flat(), feedbackRows, mediaAssets, translations),
    ...getBlockIndexErrors(rowGroups.flat()),
    // every device-specific screen needs a version for the other devices too
    ...getInputDeviceVariantErrors(rowGroups.flat()),
  };
  if (!rowGroups.flat().some((row) => row.assessmentStage === 'test_response')) {
    errors.corpus = 'no test rows; the corpus is missing or failed to load';
  }
  for (const group of rowGroups) {
    // Each instruction row is its own screen with its own assets, so check them one at a time
    const checkedGroups = isInstructionRow(group[0]) ? group.map((row) => [row]) : [group];
    for (const rows of checkedGroups) {
      const error = getRowsError(rows, mediaAssets, translations);
      // item_ids repeat across blocks, so include the block to tell rows apart
      if (error) errors[`${rows[0].block_index}:${rows[0].itemId}`] = error;
    }
  }
  return errors;
}

/**
 * Describes each trial row whose block_index is missing or lower than the row before it.
 * Rows play in corpus order and blocks are split wherever block_index changes, so an out-of-order
 * row would silently split its block in two.
 */
function getBlockIndexErrors(trialRows: CorpusRow[]) {
  const errors: Record<string, string> = {};
  let previousBlockIndex = -Infinity;
  trialRows.forEach((row, position) => {
    // item_ids repeat across blocks, so key by position among this session's trial rows
    const errorKey = `block_index:${position + 1}:${row.itemId}`;
    if (!Number.isInteger(row.block_index)) {
      errors[errorKey] = 'missing block_index';
      return;
    }
    if (row.block_index < previousBlockIndex) {
      errors[errorKey] =
        `block_index ${row.block_index} comes after block ${previousBlockIndex}; keep each block's rows together and in order`;
    }
    previousBlockIndex = Math.max(previousBlockIndex, row.block_index);
  });
  return errors;
}

/** Which of a prompt's audio and translation are missing. */
function getMissingPromptAssets(key: string, mediaAssets: MediaAssetsType, translations: Record<string, string>) {
  const missing: string[] = [];
  if (!mediaAssets.audio[key]) missing.push('audio');
  if (!translations[key]) missing.push('translation');
  return missing;
}

/** Describes each missing asset that trials use outside of corpus rows. */
function getFixedAssetErrors(mediaAssets: MediaAssetsType, translations: Record<string, string>) {
  const errors: Record<string, string> = {};
  for (const key of REQUIRED_IMAGES) {
    if (!mediaAssets.images[key]) errors[`image:${key}`] = 'missing image';
  }
  for (const key of REQUIRED_TEXT) {
    if (!translations[key]) errors[`text:${key}`] = 'missing translation';
  }
  for (const key of REQUIRED_SOUNDS) {
    if (!mediaAssets.audio[key]) errors[`audio:${key}`] = 'missing audio';
  }
  return errors;
}

/** Returns a description of what is wrong with a group of rows, or null if it can be built. */
function getRowsError(
  rows: CorpusRow[],
  mediaAssets: MediaAssetsType,
  translations: Record<string, string>,
): string | null {
  const [row] = rows;

  if (row.assessmentStage === 'instructions') {
    if (!getAudioKey(row)) return 'missing audio_file';
    const missing = getMissingPromptAssets(getAudioKey(row), mediaAssets, translations);
    if (missing.length) return `no ${missing.join(' or ')} for audio_file "${row.audioFile}"`;
  }
  if (isInstructionRow(row)) {
    if (!mediaAssets.images[getImageKey(row)]) return `no image named "${row.image}"`;
    return getButtonDemoSide(row) === undefined
      ? `instruction rows take answer "left" or "right" (a button demo) or blank, got "${row.answer}"`
      : null;
  }
  if (rows.some((r) => getInputDeviceVariant(r.itemId))) {
    return 'only instruction screens can have device versions (item_id ending in -touch, -keyboard or -mouse)';
  }
  if (isInstructionPracticeRow(row)) {
    return getInstructionPracticeSide(row)
      ? null
      : `instruction practice rows need answer "left" or "right" (the correct button), got "${row.answer ?? ''}"`;
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

/**
 * Describes what is wrong with the feedback rows and with the practice rows' feedback_item_ids:
 * every linked item_id needs a feedback row for each stimulus the practice row can show.
 */
function getFeedbackErrors(
  rows: CorpusRow[],
  feedbackRows: CorpusRow[],
  mediaAssets: MediaAssetsType,
  translations: Record<string, string>,
) {
  const errors: Record<string, string> = {};
  const feedbackRowsById = groupBy(feedbackRows, (row) => row.itemId);
  const feedbackTrialTypes = ['', ...Object.keys(BLOCK_STIMULUS_TYPE)];

  for (const row of feedbackRows) {
    const errorKey = `feedback:${row.itemId}:${row.trialType || 'any'}`;
    if (!feedbackTrialTypes.includes(row.trialType ?? '')) {
      errors[errorKey] = `feedback rows take trial_type hearts, flowers or blank, got "${row.trialType}"`;
    } else if (!getAudioKey(row) || Array.isArray(row.audioFile)) {
      errors[errorKey] = `feedback rows take one audio_file, got "${row.audioFile ?? ''}"`;
    } else if (feedbackRowsById[row.itemId].filter((r) => (r.trialType ?? '') === (row.trialType ?? '')).length > 1) {
      errors[errorKey] = 'more than one feedback row with this item_id and trial_type';
    } else {
      const missing = getMissingPromptAssets(getAudioKey(row), mediaAssets, translations);
      if (missing.length) errors[errorKey] = `no ${missing.join(' or ')} for audio_file "${row.audioFile}"`;
    }
  }

  const [correctIds, incorrectIds] = [new Set<string>(), new Set<string>()];
  for (const row of rows) {
    if (!row.feedbackItemIds) continue;
    const errorKey = `${row.block_index}:${row.itemId}:feedback`;
    if (row.assessmentStage !== 'practice_response' && !isInstructionPracticeRow(row)) {
      errors[errorKey] = 'only practice and instruction practice rows can have feedback_item_ids';
      continue;
    }
    if (row.feedbackItemIds.length !== 2) {
      errors[errorKey] =
        `feedback_item_ids must be "correct,incorrect" item_ids (either can be blank), got "${row.feedbackItemIds}"`;
      continue;
    }
    const [correctId, incorrectId] = row.feedbackItemIds;
    if (correctId) correctIds.add(correctId);
    if (incorrectId) incorrectIds.add(incorrectId);
    for (const itemId of [correctId, incorrectId].filter(Boolean)) {
      const missingStimuli = getRowStimuli(row).filter(
        (stimulus) => !findFeedbackRow(feedbackRowsById[itemId] ?? [], stimulus),
      );
      if (missingStimuli.length) {
        errors[errorKey] = `no feedback row with item_id "${itemId}" for ${missingStimuli.join(' or ')}`;
      }
    }
  }

  for (const itemId of Object.keys(feedbackRowsById)) {
    if (!correctIds.has(itemId) && !incorrectIds.has(itemId)) {
      errors[`feedback:${itemId}`] = 'no practice row has this item_id in feedback_item_ids';
    } else if (correctIds.has(itemId) && incorrectIds.has(itemId)) {
      errors[`feedback:${itemId}`] = 'used as both correct and incorrect feedback';
    }
  }
  return errors;
}
