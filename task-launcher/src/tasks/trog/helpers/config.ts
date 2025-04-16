import {
  convertItemToString,
  validateLayoutConfig,
  prepareChoices,
  DEFAULT_LAYOUT_CONFIG,
  mapDistractorsToString,
} from '../../shared/helpers';

type GetConfigReturnType = {
  itemConfig: LayoutConfigType;
  errorMessages: string[];
};

export const getLayoutConfig = (
  stimulus: StimulusType,
  translations: Record<string, string>,
  mediaAssets: MediaAssetsType,
): GetConfigReturnType => {
  const defaultConfig: LayoutConfigType = JSON.parse(JSON.stringify(DEFAULT_LAYOUT_CONFIG));
  const { answer, distractors, trialType } = stimulus;
  defaultConfig.isPracticeTrial = stimulus.assessmentStage === 'practice_response';
  defaultConfig.isInstructionTrial = stimulus.trialType === 'instructions';
  defaultConfig.showStimImage = false;
  if (!defaultConfig.isInstructionTrial) {
    const mappedDistrators = mapDistractorsToString(distractors); //convert to string
    const prepChoices = prepareChoices(answer.toString(), mappedDistrators, true, trialType);
    defaultConfig.prompt = {
      enabled: false,
      aboveStimulus: false,
    };
    defaultConfig.isImageButtonResponse = true;
    defaultConfig.classOverrides.buttonClassList = ['image-medium'];
    defaultConfig.classOverrides.buttonContainerClassList = ['lev-response-row-inline', 'grid-2x2'];
    defaultConfig.response = {
      target: prepChoices.target,
      displayValues: prepChoices.choices,
      values: prepChoices.originalChoices,
      targetIndex: prepChoices.correctResponseIdx,
    };
  } else {
    defaultConfig.classOverrides.buttonClassList = ['primary'];
    if (stimulus.item) {
      defaultConfig.showStimImage = true;
      defaultConfig.stimText = {
        value: convertItemToString(stimulus.item),
        displayValue: undefined,
      };
    }
  }

  const messages = validateLayoutConfig(defaultConfig, mediaAssets, translations, stimulus);

  return {
    itemConfig: defaultConfig,
    errorMessages: messages,
  };
};
