//@ts-ignore
import { fractionToMathML } from '../../shared/helpers';
//@ts-ignore
import { prepareChoices } from "../../shared/helpers/prepareChoices";
import { DEFAULT_LAYOUT_CONFIG } from "../../shared/helpers/config";
import { validateLayoutConfig } from "../../shared/helpers/validateLayoutConfig";

type GetConfigReturnType = {
  itemConfig: LayoutConfigType;
  errorMessages: string[];
}

export const getLayoutConfig = (
  stimulus: StimulusType,
  translations: Record<string, string>,
  mediaAssets: MediaAssetsType,
  trialNumber: number
): GetConfigReturnType => {
  const { answer, distractors, trialType } = stimulus;
  const defaultConfig: LayoutConfigType = JSON.parse(JSON.stringify(DEFAULT_LAYOUT_CONFIG));
  defaultConfig.isPracticeTrial = stimulus.assessmentStage === 'practice_response';
  defaultConfig.isInstructionTrial = stimulus.trialType === 'instructions';
  defaultConfig.showStimImage = false;
  defaultConfig.stimText = {
    value: stimulus.item,
    displayValue: undefined,
  };
  defaultConfig.inCorrectTrialConfig.onIncorrectTrial = 'skip';
  if (!defaultConfig.isInstructionTrial) {
    const prepChoices = prepareChoices(answer, distractors, true, trialType); 
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
        value: stimulus.item,
        displayValue: stimulus.trialType === 'Fraction'
          ? fractionToMathML(stimulus.item)
          : stimulus.item,
      };
    }
  } else {
    defaultConfig.classOverrides.buttonClassList = ['primary'];
  }

  const messages = validateLayoutConfig(defaultConfig, mediaAssets, translations, stimulus)

  return ({
    itemConfig: defaultConfig,
    errorMessages: messages,
  });
};
