
export const StimulusType = Object.freeze({
  Heart: 'heart',
  Flower: 'flower',
});

// Enum for the side the stimulus is shown on and also for button_choices
export const StimulusSideType = Object.freeze({
  Left: 'left',
  Right: 'right',
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