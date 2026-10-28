import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import { camelize } from '../../shared/helpers';

const PROMPT_FALLBACKS: Record<string, string> = {
  memoryGameInstruct8Downex: 'memoryGameInput',
  memoryGameInstruct11Downex: 'memoryGameBackwardPrompt',
};

export function isPromptAvailable(promptKey: string): boolean {
  const translations = taskStore().translations;
  const hasText = Boolean(translations[promptKey]);
  const hasAudio = Boolean(mediaAssets.audio[camelize(promptKey)]);

  return hasText && hasAudio;
}

export function resolveMemoryGamePrompt(promptKey: string): string {
  if (isPromptAvailable(promptKey)) {
    return promptKey;
  }

  return PROMPT_FALLBACKS[promptKey] ?? promptKey;
}
