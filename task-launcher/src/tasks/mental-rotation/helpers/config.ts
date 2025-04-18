import {
  convertItemToString,
  validateLayoutConfig,
  prepareChoices,
  DEFAULT_LAYOUT_CONFIG,
  mapDistractorsToString,
} from '../../shared/helpers';
import { taskStore } from '../../../taskStore';

type GetConfigReturnType = {
  itemConfig: LayoutConfigType;
  errorMessages: string[];
};

export const getLayoutConfig = (
  stimulus: StimulusType,
  translations: Record<string, string>,
  mediaAssets: MediaAssetsType,
): GetConfigReturnType => {
  const { answer, distractors, trialType } = stimulus;
  const defaultConfig: LayoutConfigType = JSON.parse(JSON.stringify(DEFAULT_LAYOUT_CONFIG));
  defaultConfig.isPracticeTrial = stimulus.assessmentStage === 'practice_response';
  defaultConfig.isInstructionTrial = stimulus.trialType === 'instructions';
  defaultConfig.stimText = {
    value: convertItemToString(stimulus.item),
    displayValue: undefined,
  };
  if (!defaultConfig.isInstructionTrial) {
    const mappedDistractors = mapDistractorsToString(distractors);
    const prepChoices = prepareChoices(answer.toString(), mappedDistractors, false, trialType);
    defaultConfig.isImageButtonResponse = true;
    defaultConfig.classOverrides.stimulusContainerClassList = ['lev-stim-content'];
    defaultConfig.classOverrides.buttonClassList = ['image-large'];
    defaultConfig.response = {
      target: prepChoices.target,
      displayValues: prepChoices.choices,
      values: prepChoices.originalChoices,
      targetIndex: prepChoices.correctResponseIdx,
    };
  } else {
    defaultConfig.classOverrides.buttonClassList = ['primary'];
  }

  if (taskStore().heavyInstructions && defaultConfig.isPracticeTrial) {
    defaultConfig.heavyPracticeStaggered = true;
  }

  const messages = validateLayoutConfig(defaultConfig, mediaAssets, translations, stimulus);

  return {
    itemConfig: defaultConfig,
    errorMessages: messages,
  };
};
