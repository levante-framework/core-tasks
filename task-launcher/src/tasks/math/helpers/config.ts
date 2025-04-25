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
  defaultConfig.showStimImage = stimulus.trialType === 'instructions';
  defaultConfig.stimText = {
    value: stimItem,
    displayValue: undefined,
  };
  defaultConfig.inCorrectTrialConfig.onIncorrectTrial = 'skip';
  if (!defaultConfig.isInstructionTrial) {
    const mappedDistractors = mapDistractorsToString(distractors);
    const prepChoices = prepareChoices(answer.toString(), mappedDistractors, true, trialType);
    defaultConfig.prompt.enabled = false;
    defaultConfig.isImageButtonResponse = false;
    defaultConfig.classOverrides.buttonClassList = ['secondary'];
    defaultConfig.response = {
      target: prepChoices.target,
      displayValues: prepChoices.choices,
      values: prepChoices.originalChoices,
      targetIndex: prepChoices.correctResponseIdx,
    };
    if (!['Number Identification', 'Number Comparison'].includes(stimulus.trialType)) {
      defaultConfig.stimText = {
        value: stimItem,
        displayValue: stimulus.trialType === 'Fraction' ? fractionToMathML(stimItem) : stimItem,
      };
    }
  } else {
    defaultConfig.classOverrides.buttonClassList = ['primary'];
    stimulus.trialType === "instructions" ? 
      defaultConfig.classOverrides.stimulusContainerClassList = ['lev-instructions-container'] :
      defaultConfig.classOverrides.stimulusContainerClassList = ['lev-row-container']
  }

  const messages = validateLayoutConfig(defaultConfig, mediaAssets, translations, stimulus);

  return {
    itemConfig: defaultConfig,
    errorMessages: messages,
  };
};
