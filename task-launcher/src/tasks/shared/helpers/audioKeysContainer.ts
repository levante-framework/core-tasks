import { taskStore } from '../../../taskStore';

export function getAudioKeysContainerHtml(): string {
  if (!taskStore().showAudioKeys) {
    return '';
  }

  return '<div class="audio-keys-container"></div>';
}

export function ensureAudioKeysContainer(parentContainerClass = '.lev-stimulus-container'): HTMLElement | null {
  if (!taskStore().showAudioKeys) {
    return null;
  }

  const stimulusContainer = document.querySelector(parentContainerClass);
  if (!stimulusContainer) {
    return null;
  }

  let container = stimulusContainer.querySelector('.audio-keys-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'audio-keys-container';
    stimulusContainer.insertBefore(container, stimulusContainer.firstChild);
  }

  return container as HTMLElement;
}

export function appendAudioKey(audioKey: string, parentContainerClass?: string): void {
  if (!audioKey) {
    return;
  }

  const container = ensureAudioKeysContainer(parentContainerClass);
  if (!container) {
    return;
  }

  const paragraph = document.createElement('p');
  paragraph.textContent = audioKey;
  container.appendChild(paragraph);
}
