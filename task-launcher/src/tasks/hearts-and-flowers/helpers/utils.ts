import { camelize, getParticipantUtilityButtonsHtml } from '../../shared/helpers';

type ValueOf<T> = T[keyof T];

// Prefixed to prevent clashing with global StimulusType (see types/index.d.ts)
export const HaFStimulusType = {
  Heart: 'heart',
  Flower: 'flower',
} as const;
export type HaFStimulusType = ValueOf<typeof HaFStimulusType>;

export const StimulusSideType = {
  Left: 'left',
  Right: 'right',
} as const;
export type StimulusSideType = ValueOf<typeof StimulusSideType>;

export const ResponseSideType = StimulusSideType;
export type ResponseSideType = ValueOf<typeof ResponseSideType>;

export const InputKeyType = {
  ArrowLeft: 'arrowleft',
  ArrowRight: 'arrowright',
  NoKeys: 'NO_KEYS',
  AllKeys: 'ALL_KEYS',
  SpaceBar: ' ',
  Enter: 'enter',
} as const;
export type InputKeyType = ValueOf<typeof InputKeyType>;

export type CorpusRow = Pick<
  StimulusType,
  | 'itemId'
  | 'block_index'
  | 'assessmentStage'
  | 'trialType'
  | 'audioFile'
  | 'image'
  | 'answer'
  | 'timeLimit'
  | 'feedbackItemIds'
  | 'device'
>;

// The trial_type of practice and test rows
export const BlockType = {
  Hearts: 'hearts',
  Flowers: 'flowers',
  Mixed: 'hearts and flowers',
} as const;
export type BlockType = ValueOf<typeof BlockType>;

export const BLOCK_STIMULUS_TYPE: Record<string, HaFStimulusType> = {
  [BlockType.Hearts]: HaFStimulusType.Heart,
  [BlockType.Flowers]: HaFStimulusType.Flower,
};

export function getAudioKey(row: CorpusRow) {
  return camelize(String(row.audioFile ?? '').trim());
}

export function getImageKey(row: CorpusRow) {
  return camelize(String(row.image ?? '').trim());
}

export function isInstructionRow(row: CorpusRow) {
  return row.assessmentStage === 'instructions' && row.trialType === 'instructions';
}

export function isInstructionPracticeRow(row: CorpusRow) {
  return row.assessmentStage === 'instructions' && row.trialType in BLOCK_STIMULUS_TYPE;
}

export function isFeedbackRow(row: CorpusRow) {
  return row.assessmentStage === 'feedback';
}

export function getRowStimuli(row: CorpusRow): HaFStimulusType[] {
  return row.trialType in BLOCK_STIMULUS_TYPE
    ? [BLOCK_STIMULUS_TYPE[row.trialType]]
    : [HaFStimulusType.Heart, HaFStimulusType.Flower];
}

/**
 * Instruction practice trials show the stimulus on a fixed side, because the prompt audio names it.
 * The row's answer is the correct button, so the stimulus is on that side for a heart and the other side for a flower.
 */
export function getInstructionPracticeSide(row: CorpusRow): StimulusSideType | undefined {
  const answer = String(row.answer ?? '').trim();
  if (answer !== StimulusSideType.Left && answer !== StimulusSideType.Right) return undefined;
  if (BLOCK_STIMULUS_TYPE[row.trialType] === HaFStimulusType.Heart) return answer;
  else return answer === StimulusSideType.Left ? StimulusSideType.Right : StimulusSideType.Left;
}

/**
 * The side of the one button a button demo instruction screen shows, from the row's answer:
 * null for a plain instruction screen (blank answer), or undefined if the answer isn't valid.
 */
export function getButtonDemoSide(row: CorpusRow): StimulusSideType | null | undefined {
  const answer = String(row.answer ?? '').trim();
  if (!answer) return null;
  return answer === StimulusSideType.Left || answer === StimulusSideType.Right ? answer : undefined;
}

export type FeedbackOutcome = 'correct' | 'incorrect';

export function findFeedbackRow(rowsWithId: CorpusRow[], stimulus: HaFStimulusType) {
  return (
    rowsWithId.find((row) => BLOCK_STIMULUS_TYPE[row.trialType] === stimulus) ??
    rowsWithId.find((row) => !row.trialType)
  );
}

/**
 * A practice row's feedback_item_ids name the feedback rows to play after a correct and a wrong answer.
 * This function finds the feedback row for the stimulus and outcome of a given trial via its row in the corpus, then returns its audio key.
 */
export function getFeedbackPromptKey(
  feedbackRows: CorpusRow[],
  row: CorpusRow,
  outcome: FeedbackOutcome,
  stimulus: HaFStimulusType,
): string | undefined {
  const feedbackItemId = row.feedbackItemIds?.[outcome === 'correct' ? 0 : 1];
  if (!feedbackItemId) return undefined;
  const feedbackRow = findFeedbackRow(
    feedbackRows.filter((candidate) => candidate.itemId === feedbackItemId),
    stimulus,
  );
  return feedbackRow && getAudioKey(feedbackRow);
}

/** The side for a timeline variable's 0/1 position (see buildHeartsOrFlowersTimelineVariables). */
export function getStimulusSideFromPosition(position: number): StimulusSideType {
  return position === 0 ? StimulusSideType.Left : StimulusSideType.Right;
}

export function getCorrectInputSide(stimulusType: HaFStimulusType, stimulusSideType: StimulusSideType): 0 | 1 {
  const stimulusPosition = stimulusSideType === StimulusSideType.Left ? 0 : 1;
  return (
    stimulusType === HaFStimulusType.Heart // same side for heart; opposite for flower
      ? stimulusPosition
      : 1 - stimulusPosition
  ) as 0 | 1;
}

export const getStimulusLayout = (
  imageSrc: string,
  stimulusSide: StimulusSideType,
  promptText?: string,
  replayButtonHtmlId?: string,
): string => {
  const stimulusClass = stimulusSide === StimulusSideType.Left ? 'stimulus-left' : 'stimulus-right';
  const includeReplayButton = replayButtonHtmlId !== undefined;

  let template = '<div class="haf-stimulus-holder">';
  template += getParticipantUtilityButtonsHtml(replayButtonHtmlId ?? '', includeReplayButton);

  if (promptText) {
    template += `
      <div class='lev-row-container instruction'>
        <p>
          ${promptText}
        </p>
      </div>
    `;
  }
  template += `
      <div class='haf-stimulus-container'>
        <div class='${stimulusClass}'>
          <img src='${imageSrc}' alt="heart or flower"/>
        </div>
      </div>
    </div>
  `;

  return template;
};
