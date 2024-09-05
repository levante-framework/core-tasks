import { camelize } from "../../shared/helpers/camelize";
//@ts-ignore
import { prepareChoices } from "../../shared/helpers/prepareChoices";
import { DEFAULT_LAYOUT_CONFIG } from "../../shared/helpers/config";

export const getLayoutConfig = (stimulus: StimulusType): LayoutConfigType => {
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
    } else {
      // Instructions should have prompts
      if (!c.prompt) {
        messages.push('Missing prompt for: ' + c.itemId);
      }
    }
  }

  return messages;
};
