// Corpus checks shared by tasks that build their timeline from corpus rows in order.
// Each returns a map of error key to message; pass the merged map to reportCorpusValidationErrors.

type BlockRow = { itemId: string; block_index: number };
type FeedbackLinkRow = BlockRow & { feedbackItemIds?: string[] };

/** Which of a prompt's audio and translation are missing. */
export function getMissingPromptAssets(
  key: string,
  mediaAssets: MediaAssetsType,
  translations: Record<string, string>,
) {
  const missing: string[] = [];
  if (!mediaAssets.audio[key]) missing.push('audio');
  if (!translations[key]) missing.push('translation');
  return missing;
}

/**
 * Describes each trial row whose block_index is missing or lower than the row before it.
 * Rows play in corpus order and blocks are split wherever block_index changes, so an out-of-order
 * row would silently split its block in two.
 */
export function getBlockIndexErrors(trialRows: BlockRow[], keyPrefix = '') {
  const errors: Record<string, string> = {};
  let previousBlockIndex = -Infinity;
  trialRows.forEach((row, position) => {
    // item_ids repeat across blocks, so key by position among the trial rows
    const errorKey = `${keyPrefix}block_index:${position + 1}:${row.itemId}`;
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

/**
 * Describes problems with how trial rows link feedback rows through feedback_item_ids ("correct,incorrect"):
 * a link on a row that can't have feedback, a malformed value, a link with no matching feedback row,
 * a feedback row no row links, and a feedback row used for both outcomes.
 *
 * - canHaveFeedback: which trial rows may link feedback
 * - getMissingFeedback: why a linked item_id doesn't resolve for this row, or null if it does
 *   (tasks whose feedback varies by stimulus check each stimulus here)
 */
export function getFeedbackLinkErrors<Row extends FeedbackLinkRow>(
  rows: Row[],
  feedbackItemIds: Iterable<string>,
  {
    canHaveFeedback,
    getMissingFeedback,
    keyPrefix = '',
  }: {
    canHaveFeedback: (row: Row) => boolean;
    getMissingFeedback: (itemId: string, row: Row) => string | null;
    keyPrefix?: string;
  },
) {
  const errors: Record<string, string> = {};
  const [correctIds, incorrectIds] = [new Set<string>(), new Set<string>()];

  for (const row of rows) {
    if (!row.feedbackItemIds) continue;
    const errorKey = `${keyPrefix}${row.block_index}:${row.itemId}:feedback`;
    if (!canHaveFeedback(row)) {
      errors[errorKey] = "this row type can't have feedback_item_ids";
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
      const missing = getMissingFeedback(itemId, row);
      if (missing) errors[errorKey] = missing;
    }
  }

  for (const itemId of new Set(feedbackItemIds)) {
    if (!correctIds.has(itemId) && !incorrectIds.has(itemId)) {
      errors[`${keyPrefix}feedback:${itemId}`] = 'no row has this item_id in feedback_item_ids';
    } else if (correctIds.has(itemId) && incorrectIds.has(itemId)) {
      errors[`${keyPrefix}feedback:${itemId}`] = 'used as both correct and incorrect feedback';
    }
  }
  return errors;
}
