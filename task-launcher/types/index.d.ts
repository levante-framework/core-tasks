export {};

declare global {
  // Per trial layout config that can be preprocessed when creating timeline
  // and validated for assets
  type LayoutConfigType = {
    noAudio: boolean; // stimulus will not play audio (null Audio)
    staggered: {
      enabled: boolean,
      trialTypes: string[], // filter for trial types, TODO: Remove this and move the logic to the task
    },
    classOverrides: {
      buttonContainerClass: string; // This is where we can declare grid etc
      buttonClass: string; // primary, secondary, image-large, image etc 
      promptClass: string;
      stimulusContainerClass: string;
    },
    prompt: {
      enabled: boolean;
      aboveStimulus: boolean;
    }
    showStimText: boolean;
    equalSizeStim: boolean; // TODO Remove since classes declaration can handle this
    disableButtonsWhenAudioPlaying: boolean;
    isPracticeTrial: boolean;
    isInstructionTrial: boolean;
    randomizeChoiceOrder: boolean;
  }
}