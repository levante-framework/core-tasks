import { taskStore } from '../../../taskStore';
import { Logger } from '../../../utils/logger';
import { getParticipantUtilityButtonsHtml } from '../../shared/helpers';

export const StimulusType = {
  Heart: 'heart',
  Flower: 'flower',
} as const;
export type StimulusType = (typeof StimulusType)[keyof typeof StimulusType];

// Enum for the side the stimulus is shown on and also for button_choices (ResponseSideType)
export const StimulusSideType = {
  Left: 'left',
  Right: 'right',
} as const;
export type StimulusSideType = (typeof StimulusSideType)[keyof typeof StimulusSideType];

export const ResponseSideType = StimulusSideType;
export type ResponseSideType = (typeof ResponseSideType)[keyof typeof ResponseSideType];

// Enum for the jsPsych keyboard inputs
export const InputKey = {
  ArrowLeft: 'arrowleft',
  ArrowRight: 'arrowright',
  NoKeys: 'NO_KEYS', // aka no key input accepted
  AllKeys: 'ALL_KEYS', // aka any key is accepted
  SpaceBar: ' ',
  Enter: 'enter',
} as const;
export type InputKey = (typeof InputKey)[keyof typeof InputKey];

export const AssessmentStageType = {
  HeartsPractice: 'practice_response',
  FlowersPractice: 'practice_response',
  HeartsStimulus: 'test_response',
  FlowersStimulus: 'test_response',
  HeartsAndFlowersPractice: 'practice_response',
  HeartsAndFlowersStimulus: 'test_response',
} as const;
export type AssessmentStageType = (typeof AssessmentStageType)[keyof typeof AssessmentStageType];

export const CorpusTrialType = {
  HeartsPractice: 'hearts',
  FlowersPractice: 'flowers',
  HeartsStimulus: 'hearts',
  FlowersStimulus: 'flowers',
  HeartsAndFlowersPractice: 'hearts and flowers',
  HeartsAndFlowersStimulus: 'hearts and flowers',
} as const;
export type CorpusTrialType = (typeof CorpusTrialType)[keyof typeof CorpusTrialType];

// TODO: better Exception/Error handling
/**
 * Helper function to get expected valid answer (side) for a given stimulus type and side.
 * @param {*} stimulusType the type of stimulus: StimulusType.Heart or StimulusType.Flower
 * @param {*} stimulusSideType the side of the stimulus: StimulusSideType.Left or StimulusSideType.Right
 * @returns 0 for left, 1 for right
 */
export function getCorrectInputSide(stimulusType: StimulusType, stimulusSideType: StimulusSideType) {
  if (stimulusType === StimulusType.Heart) {
    if (stimulusSideType === StimulusSideType.Left) {
      return 0;
    } else if (stimulusSideType === StimulusSideType.Right) {
      return 1;
    } else {
      Logger.getInstance().error(new Error('Invalid stimulus side'));
    }
  } else if (stimulusType === StimulusType.Flower) {
    if (stimulusSideType === StimulusSideType.Left) {
      return 1;
    } else if (stimulusSideType === StimulusSideType.Right) {
      return 0;
    } else {
      throw new Error('Invalid stimulus side');
    }
  } else {
    throw new Error('Invalid stimulus');
  }
}

/**
 * retrieve html for the visual stimulus container
 * @param {*} imageSrc stimulus image source
 * @param {*} isLeft whether the stimulus should be shown on the left side
 * @param {*} promptText if you need to show a prompt text,
 * @param {*} replayButtonHtmlId if you need to show an audio replay button
 * @returns
 */
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
