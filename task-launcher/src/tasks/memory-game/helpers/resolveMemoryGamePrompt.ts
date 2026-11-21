import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import { getMissingPromptAssets } from '../../shared/helpers/corpusValidation';

const PROMPT_FALLBACKS: Record<string, string> = {
  memoryGameInstruct8Downex: 'memoryGameInput',
  memoryGameInstruct10Downex: 'memoryGameInstruct5',
  memoryGameInstruct11Downex: 'memoryGameBackwardPrompt',
};

/** promptKey is camelized, so it's both the audio and the translation key. */
function isPromptAvailable(promptKey: string): boolean {
  return getMissingPromptAssets(promptKey, mediaAssets, taskStore().translations).length === 0;
}

export function resolveMemoryGamePrompt(promptKey: string): string {
  if (isPromptAvailable(promptKey)) {
    return promptKey;
  }

  return PROMPT_FALLBACKS[promptKey] ?? promptKey;
}
