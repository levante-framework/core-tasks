//@ts-ignore
import { prepareChoices } from "../../shared/helpers/prepareChoices";
import { DEFAULT_LAYOUT_CONFIG } from "../../shared/helpers/config";
import { validateLayoutConfig } from "../../shared/helpers/validateLayoutConfig";
import type { LayoutConfigTypeInference } from '../types/inferenceTypes';

type GetConfigReturnType = {
  itemConfig: LayoutConfigTypeInference;
  errorMessages: string[];
}

export const getLayoutConfig = (
  stimulus: StimulusType,
  translations: Record<string, string>,
  mediaAssets: MediaAssetsType,
  trialNumber: number
): GetConfigReturnType => {
  const { answer, distractors, trialType } = stimulus;
  const defaultConfig: LayoutConfigTypeInference = JSON.parse(JSON.stringify(DEFAULT_LAYOUT_CONFIG));
  defaultConfig.playAudioOnLoad = false;
  defaultConfig.isPracticeTrial = stimulus.assessmentStage === 'practice_response';
  defaultConfig.classOverrides.buttonContainerClassList = ['lev-response-row', 'multi-stack'];
  defaultConfig.isInstructionTrial = stimulus.trialType === 'instructions';
  defaultConfig.prompt.enabled = true;
  defaultConfig.prompt.useStimText = true;
  defaultConfig.stimText = {
    value: stimulus.item,
    displayValue: undefined,
  };
  defaultConfig.disableButtonsWhenAudioPlaying = true;
  if (!defaultConfig.isInstructionTrial) {
    const prepChoices = prepareChoices(answer, distractors, true, trialType); 
    defaultConfig.isImageButtonResponse = false;
    defaultConfig.classOverrides.buttonClassList = ['roar-inference-btn'];
    defaultConfig.response = {
      target: prepChoices.target,
      displayValues: prepChoices.choices,
      values: prepChoices.originalChoices,
      targetIndex: prepChoices.correctResponseIdx,
    };
  } else {
    defaultConfig.classOverrides.buttonClassList = ['primary'];
  }

  const messages = validateLayoutConfig(defaultConfig, mediaAssets, translations, stimulus)

  return ({
    itemConfig: defaultConfig,
    errorMessages: messages,
  });
};
