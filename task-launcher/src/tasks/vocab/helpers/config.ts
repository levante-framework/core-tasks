import { camelize } from "../../shared/helpers/camelize";
//@ts-ignore
import { prepareChoices } from "../../shared/helpers/prepareChoices";
import { DEFAULT_LAYOUT_CONFIG } from "../../shared/helpers/config";
import { validateLayoutConfig } from "../../shared/helpers/validateLayoutConfig";

type GetConfigReturnType = {
  itemConfig: LayoutConfigType;
  errorMessages: string[];
}

export const getLayoutConfig = (stimulus: StimulusType, translations: Record<string, string>, mediaAssets: MediaAssetsType): GetConfigReturnType => {
  const defaultConfig: LayoutConfigType = JSON.parse(JSON.stringify(DEFAULT_LAYOUT_CONFIG));
  const { answer, distractors, trialType } = stimulus;
  defaultConfig.isPracticeTrial = stimulus.assessmentStage === 'practice_response';
  defaultConfig.isInstructionTrial = stimulus.trialType === 'instructions';
  defaultConfig.showStimImage = false;
  defaultConfig.showStimText = false;
  if (!defaultConfig.isInstructionTrial) {
    defaultConfig.prompt = {
      enabled: false,
      aboveStimulus: false,
    };
    defaultConfig.isImageButtonResponse = true;
    defaultConfig.buttonChoices = prepareChoices(answer, distractors, true, trialType).choices;
    defaultConfig.classOverrides.buttonClassList = ['image-medium'];
    defaultConfig.classOverrides.buttonContainerClassList = ['lev-response-row-inline', 'grid-2x2'];    
  } else {
    defaultConfig.classOverrides.buttonClassList = ['primary'];
  }

  const messages = validateLayoutConfig(defaultConfig, mediaAssets, translations, stimulus)

  return ({
    itemConfig: defaultConfig,
    errorMessages: messages,
  });
  
};
