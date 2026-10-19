import { taskStore } from '../../../taskStore';
import { camelize, getParticipantUtilityButtonsHtml } from '../../shared/helpers';

export const HaFStimulusType = {
  Heart: 'heart',
  Flower: 'flower',
} as const;
export type HaFStimulusType = (typeof HaFStimulusType)[keyof typeof HaFStimulusType];

// Enum for the side the stimulus is shown on and also for button_choices (ResponseSideType)
export const StimulusSideType = {
  Left: 'left',
  Right: 'right',
} as const;
export type StimulusSideType = (typeof StimulusSideType)[keyof typeof StimulusSideType];

export const ResponseSideType = StimulusSideType;
export type ResponseSideType = (typeof ResponseSideType)[keyof typeof ResponseSideType];

// Enum for the jsPsych keyboard inputs
export const InputKeyType = {
  ArrowLeft: 'arrowleft',
  ArrowRight: 'arrowright',
  NoKeys: 'NO_KEYS', // aka no key input accepted
  AllKeys: 'ALL_KEYS', // aka any key is accepted
  SpaceBar: ' ',
  Enter: 'enter',
} as const;
export type InputKeyType = (typeof InputKeyType)[keyof typeof InputKeyType];

export type CorpusRow = Pick<
  StimulusType,
  'itemId' | 'block_index' | 'assessmentStage' | 'trialType' | 'audioFile' | 'image' | 'timeLimit'
>;

// The trial_type of practice and test rows
export const BlockType = {
  Hearts: 'hearts',
  Flowers: 'flowers',
  Mixed: 'hearts and flowers',
} as const;
export type BlockType = (typeof BlockType)[keyof typeof BlockType];
export const BLOCK_STIMULUS_TYPE: Record<string, HaFStimulusType> = {
  [BlockType.Hearts]: HaFStimulusType.Heart,
  [BlockType.Flowers]: HaFStimulusType.Flower,
};

// Instruction practice trials show the stimulus on a fixed side, because the prompt audio names it.
// Keyed by the camelized audio_file of the row.
export const INSTRUCTION_PRACTICE_SIDES: Record<string, StimulusSideType> = {
  heartInstruct2: StimulusSideType.Left,
  heartPracticeFeedback1: StimulusSideType.Right,
  flowerInstruct2: StimulusSideType.Right,
  flowerPracticeFeedback1: StimulusSideType.Left,
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

export function isPracticeInstructionRow(row: CorpusRow) {
  return row.assessmentStage === 'instructions' && row.trialType in BLOCK_STIMULUS_TYPE;
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
  isLeft: boolean,
  promptText?: string,
  replayButtonHtmlId?: string,
): string => {
  const stimulusClass = isLeft ? 'stimulus-left' : 'stimulus-right';
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

export const getInputInstructPrompt = (showButton: boolean = false): string => {
  const inputCapability = taskStore().inputCapability;

  if (showButton) {
    return inputCapability?.touch ? 'heartsAndFlowersInstructButtonTouch' : 'heartsAndFlowersInstructKeyPress';
  } else {
    return inputCapability?.touch ? 'heartsAndFlowersInstructTouchscreen' : 'heartsAndFlowersInstructKeyboard';
  }
};
