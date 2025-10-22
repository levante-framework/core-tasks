import {
  convertItemToString,
  validateLayoutConfig,
  prepareChoices,
  DEFAULT_LAYOUT_CONFIG,
  mapDistractorsToString,
  fractionToMathML,
} from '../../shared/helpers';

type GetConfigReturnType = {
  itemConfig: LayoutConfigType;
  errorMessages: string[];
};

export const getLayoutConfig = (
  stimulus: StimulusType,
  translations: Record<string, string>,
  mediaAssets: MediaAssetsType,
  trialNumber: number,
): GetConfigReturnType => {
  const { answer, distractors, trialType } = stimulus;
  const defaultConfig: LayoutConfigType = JSON.parse(JSON.stringify(DEFAULT_LAYOUT_CONFIG));
  const stimItem = convertItemToString(stimulus.item);
  defaultConfig.isPracticeTrial = stimulus.assessmentStage === 'practice_response';
  defaultConfig.isInstructionTrial = stimulus.trialType === 'instructions';
  defaultConfig.showStimImage = false;
  defaultConfig.stimText = {
    value: stimItem,
    displayValue: undefined,
  };
  if (!defaultConfig.isInstructionTrial) {
    const mappedDistractors = mapDistractorsToString(distractors);
    defaultConfig.prompt.enabled = true;
    defaultConfig.isImageButtonResponse = false;
    defaultConfig.classOverrides.buttonClassList = ['secondary--wide']
    defaultConfig.response = {
      target: '',
      displayValues: mappedDistractors,
      values: mappedDistractors,
      targetIndex: 0,
    }; 
    defaultConfig.isStaggered = true;
  } else {
    defaultConfig.classOverrides.buttonClassList = ['primary'];
    stimulus.trialType === 'instructions'
      ? (defaultConfig.classOverrides.stimulusContainerClassList = ['lev-instructions-container'])
      : (defaultConfig.classOverrides.stimulusContainerClassList = ['lev-row-container']);
  }

  const messages = validateLayoutConfig(defaultConfig, mediaAssets, translations, stimulus);

  return {
    itemConfig: defaultConfig,
    errorMessages: messages,
  };
};
