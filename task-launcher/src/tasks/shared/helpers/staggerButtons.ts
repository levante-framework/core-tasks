import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import { Logger } from '../../../utils/logger';
import { PageAudioHandler } from './audioHandler';
import { camelize } from './camelize';
import type { PageStateHandler } from './PageStateHandler';

let staggerEnabled = true;
let staggerTimeout: NodeJS.Timeout | null = null;
let replayEnableTimeout: NodeJS.Timeout | null = null;

export const handleStaggeredButtons = async (
  pageState: PageStateHandler,
  buttons: HTMLButtonElement[],
  audioList: string[],
  currentTrialId?: string,
  disableButtons = true,
  pulseButtons = false,
) => {
  const stimulusDuration = await pageState.getStimulusDurationMs();
  const intialDelay = stimulusDuration + 300;

  staggerEnabled = true;

  if (replayEnableTimeout) {
    clearTimeout(replayEnableTimeout);
  }

  if (staggerTimeout) {
    clearTimeout(staggerTimeout);
  }

  // Disable the replay button till this animation is finished
  replayEnableTimeout = setTimeout(() => {
    pageState.disableReplayBtn();
  }, stimulusDuration + 110);

  if (disableButtons) {
    for (const jsResponseEl of buttons) {
      // disable the buttons so that they are not active during the animation
      jsResponseEl.classList.add(
        'lev-staggered-responses',
        'lev-staggered-disabled',
        'lev-staggered-grayscale',
        'lev-staggered-opacity',
      );
    }
  }

  // Return a Promise that resolves when the staggered animation is complete
  const staggerPromise = new Promise<void>((resolve) => {
    staggerTimeout = setTimeout(() => {
      showStaggeredBtnAndPlaySound(
        0,
        buttons,
        audioList,
        pageState,
        resolve, // Pass the resolve function to be called when animation completes
        currentTrialId,
        pulseButtons,
      );
    }, intialDelay);
  });

  taskStore('staggerTimeout', staggerTimeout);
  taskStore('replayEnableTimeout', replayEnableTimeout);

  return staggerPromise;
};

const showStaggeredBtnAndPlaySound = (
  index: number,
  btnList: HTMLButtonElement[],
  audioList: string[],
  pageState: PageStateHandler,
  onComplete?: () => void,
  currentTrialId?: string,
  pulseButtons: boolean = false,
) => {
  // check if the trial id has changed - we don't want overlap between trials
  const actualTrialId = taskStore().nextStimulus?.itemId;
  if (!staggerEnabled || (currentTrialId && currentTrialId !== actualTrialId)) {
    return;
  }

  const btn = btnList[index];
  btn.classList.remove('lev-staggered-grayscale', 'lev-staggered-opacity');

  if (pulseButtons) {
    btn.style.animation = 'pulse 2s 0s 1';
  }

  const audioKey = camelize(audioList[index]);
  if (!mediaAssets.audio[audioKey]) {
    Logger.getInstance().error(new Error(`Audio Asset not available for: ${audioList[index]}`), {
      source: 'handleStaggeredButtons',
      audio: audioList[index],
    });
  }

  const audioConfig: AudioConfigType = {
    restrictRepetition: {
      enabled: false,
    },
    onEnded: () => {
      const actualTrialId = taskStore().nextStimulus?.itemId;
      if (!staggerEnabled || (currentTrialId && currentTrialId !== actualTrialId)) {
        return;
      }

      if (index + 1 === btnList?.length) {
        // Last Element
        for (const jsResponseEl of btnList) {
          jsResponseEl.classList.remove('lev-staggered-disabled');
        }
        pageState.enableReplayBtn();
        onComplete?.();
      } else {
        //recurse
        showStaggeredBtnAndPlaySound(
          index + 1,
          btnList,
          audioList,
          pageState,
          onComplete,
          currentTrialId,
          pulseButtons,
        );
      }
    },
  };

  PageAudioHandler.playAudio(audioKey, audioConfig);
};

export const disableStagger = () => {
  staggerEnabled = false;
};
