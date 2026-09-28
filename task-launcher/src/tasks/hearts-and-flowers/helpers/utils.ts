import { taskStore } from '../../../taskStore';
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

export function getCorrectInputSide(stimulusType: StimulusType, stimulusSideType: StimulusSideType): 0 | 1 {
  const stimulusPosition = stimulusSideType === StimulusSideType.Left ? 0 : 1;
  return (
    stimulusType === StimulusType.Heart // same side for heart; opposite for flower
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
