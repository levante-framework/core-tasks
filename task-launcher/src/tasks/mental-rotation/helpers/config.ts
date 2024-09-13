import { camelize } from "../../shared/helpers/camelize";
//@ts-ignore
import { prepareChoices } from "../../shared/helpers/prepareChoices";
import { DEFAULT_LAYOUT_CONFIG } from "../../shared/helpers/config";

export const getLayoutConfig = (stimulus: StimulusType, trialNumber: number): LayoutConfigType => {
  const { answer, distractors, trialType } = stimulus;
  const defaultConfig: LayoutConfigType = JSON.parse(JSON.stringify(DEFAULT_LAYOUT_CONFIG));
  defaultConfig.isPracticeTrial = stimulus.assessmentStage === 'practice_response';
  defaultConfig.isInstructionTrial = stimulus.trialType === 'instructions';
  defaultConfig.stimText = {
    value: stimulus.item,
    displayValue: undefined,
  };
  if (!defaultConfig.isInstructionTrial) {
    const prepChoices = prepareChoices(answer, distractors, false, trialType);
    defaultConfig.isImageButtonResponse = true;
    defaultConfig.buttonChoices = prepChoices.choices;
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

  return defaultConfig;
  
};

export const validateCorpus = (corpus: StimulusType[], mediaAssets: MediaAssetsType) => {
  const messages = [];
  for (const c of corpus) {
    // validate audiofile
    if (!c.audioFile) {
      messages.push('Missing audioFile string in corpus for:' + c.itemId);
    } else {
      const audioAsset = camelize(c.audioFile);

      if (!mediaAssets.audio[audioAsset]) {
        messages.push('Missing audio asset:' + audioAsset)
      }
    }

    if (!c.prompt) {
      messages.push('Missing prompt for: ' + c.itemId);
    }

    // check the image asset for the stimulus
    if (!mediaAssets.images[camelize(c.item)]) {
      messages.push('Missing stimulus image for: ' + c.itemId);
    }

    if (c.trialType !== 'instructions') {
      // validate all the image buttons
      if (!c.answer) {
        messages.push('Missing answer for: ' + c.itemId);
      }
      if (!c.distractors.length) {
        messages.push('Missing distractors for: ' + c.itemId);
      }
      const imageButtons = [c.answer, ...c.distractors];
      for (const imageButton of imageButtons) {
        const imageAsset = camelize(imageButton);
        if (!imageAsset) {
          messages.push(`Missing image button string: ${imageAsset} for: ${c.itemId}`);
        }
        if (!mediaAssets.images[imageAsset]) {
          messages.push(`Missing imageAsset: ${imageAsset} for: ${c.itemId}`);
        }
      }
    }
  }

  return messages;
};
