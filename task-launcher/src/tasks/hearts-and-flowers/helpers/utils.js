import { replayButtonSvg } from './audioTrials';

export const StimulusType = Object.freeze({
  Heart: 'heart',
  Flower: 'flower',
});

// Enum for the side the stimulus is shown on and also for button_choices
export const StimulusSideType = Object.freeze({
  Left: 'left',
  Right: 'right',
});

// Enum for the keyboard inputs
export const InputKey = Object.freeze({
  ArrowLeft: 'arrowleft',
  ArrowRight: 'arrowright',
});


export const AssessmentStageType = Object.freeze({
    HeartsPractice: 'hearts practice',
    FlowersPractice: 'flowers practice',
    HeartsStimulus: 'hearts stimulus',
    FlowersStimulus: 'flowers stimulus',
    HeartsAndFlowersPractice: 'hearts and flowers practice',
    HeartsAndFlowersStimulus: 'hearts and flowers stimulus',
});


// TODO: better Exception/Error handling
/**
 * Helper function to get expected valid answer (side) for a given stimulus type and side.
 * @param {*} stimulusType the type of stimulus: StimulusType.Heart or StimulusType.Flower
 * @param {*} stimulusSideType the side of the stimulus: StimulusSideType.Left or StimulusSideType.Right
 * @returns 0 for left, 1 for right
 */
export function getCorrectInputSide(stimulusType, stimulusSideType) {
  if (stimulusType === StimulusType.Heart) {
    if (stimulusSideType === StimulusSideType.Left) {
      return 0;
    } else if (stimulusSideType === StimulusSideType.Right) {
      return 1;
    } else {
      console.error('Invalid stimulus side');
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
export const getStimulusLayout = (imageSrc, isLeft, promptText=undefined, replayButtonHtmlId=undefined) => {
  const stimulusClass = isLeft ? 'stimulus-left' : 'stimulus-right';
  let template = `
  <div class='parent-stimulus-hf'>`;
  if (replayButtonHtmlId) {
    template += `
      <div id='${replayButtonHtmlId}'>
        ${replayButtonSvg}
      </div>
    `
  }
  if (promptText) {
    template += `
      <div class='instruction-container'>
          <p class='practice-text'>
            ${promptText}
          </p>
      </div>
    `
  }
  template += `
      <div id='stimulus-container-hf'>
        <div class='${stimulusClass}'>
            <img src='${imageSrc}' alt="heart or flower"/>
        </div>
      </div>
    </div>
  `

  return template;
}; 
