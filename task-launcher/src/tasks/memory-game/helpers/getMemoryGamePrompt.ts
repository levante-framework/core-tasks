import { taskStore } from '../../../taskStore';
import { resolveMemoryGamePrompt } from './resolveMemoryGamePrompt';

export function getMemoryGamePrompt(mode: 'display' | 'input', reverse: boolean) {
  const inputAudioPrompt = reverse ? 'memoryGameInstruct11Downex' : 'memoryGameInstruct8Downex';
  const displayAudioPrompt = taskStore().heavyInstructions ? 'memoryGameInstruct7Downex' : 'memoryGameDisplay';

  const prompt = mode === 'display' ? displayAudioPrompt : inputAudioPrompt;

  return mode === 'input' ? resolveMemoryGamePrompt(prompt) : prompt;
}
