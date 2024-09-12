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
  if (!defaultConfig.isInstructionTrial) {
    defaultConfig.prompt.enabled = false;
    defaultConfig.showStimText = false;
    defaultConfig.isImageButtonResponse = false;
    defaultConfig.classOverrides.buttonClassList = ['secondary'];
    defaultConfig.buttonChoices = prepareChoices(answer, distractors, true, trialType).choices;
  } else {
    defaultConfig.classOverrides.buttonClassList = ['primary'];
  }

  const messages = validateLayoutConfig(defaultConfig, mediaAssets, translations, stimulus)

  return ({
    itemConfig: defaultConfig,
    errorMessages: messages,
  });
};
