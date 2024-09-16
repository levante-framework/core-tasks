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
      buttonContainerClassList: string[]; // This is where we can declare grid etc
      buttonClassList: string[]; // primary, secondary, image-large, image etc 
      promptClassList: string[];
      stimulusContainerClassList: string[];
    },
    prompt: {
      enabled: boolean;
      aboveStimulus: boolean;
    }
    equalSizeStim: boolean; // TODO Remove since classes declaration can handle this
    disableButtonsWhenAudioPlaying: boolean;
    isPracticeTrial: boolean;
    isInstructionTrial: boolean;
    randomizeChoiceOrder: boolean;
    isStaggered: boolean;
    isImageButtonResponse: boolean;
    showStimImage: boolean;
    response: {
      values: string[];
      displayValues: string[];
      target: string;
      targetIndex: number;
    };
    stimText?: {
      value?: string;
      displayValue?: string; 
    };
    inCorrectTrialConfig: {
      onIncorrectTrial: 'skip' | 'end';
      // Other config can be placed here
    };
  }

  type StimulusType = {
    source: string;
    block_index?: string;
    task: string; // TODO: define all task types here
    item: string;
    trialType: string;
    image: string;
    answer: string;
    assessmentStage: string;
    chanceLevel: string;
    itemId: string;
    distractors: string[];
    audioFile: string;
    requiredSelections: number;
    blockIndex?: number;
    prompt: string;
  };

  type MediaAssetsType = {
    images: Record<string, string>;
    audio: Record<string, string>;
    video: Record<string, string>;
  };

  type GameParamsType = Record<string, string>;
  type UserParamsType = Record<string, string>;
}
