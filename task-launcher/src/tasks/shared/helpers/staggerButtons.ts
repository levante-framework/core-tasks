import { PageStateHandler } from './PageStateHandler';
import { PageAudioHandler } from './audioHandler';
import { mediaAssets } from '../../..';
import { camelize } from './camelize';

let staggerEnabled = true;

export const handleStaggeredButtons = async (
  pageState: PageStateHandler,
  buttonContainer: HTMLDivElement,
  audioList: string[],
  disableButtons = true,
) => {
  const parentResponseDiv = buttonContainer;
  let i = 0;
  const stimulusDuration = await pageState.getStimulusDurationMs();
  const intialDelay = stimulusDuration + 300;

  staggerEnabled = true;

  // Disable the replay button till this animation is finished
  setTimeout(() => {
    pageState.disableReplayBtn();
  }, stimulusDuration + 110);

  if (disableButtons) {
    for (const jsResponseEl of parentResponseDiv.children) {
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
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      showStaggeredBtnAndPlaySound(
        0,
        Array.from(parentResponseDiv?.children as HTMLCollectionOf<HTMLButtonElement>),
        audioList,
        pageState,
        resolve, // Pass the resolve function to be called when animation completes
      );
    }, intialDelay);
  });
};

const showStaggeredBtnAndPlaySound = (
  index: number,
  btnList: HTMLButtonElement[],
  audioList: string[],
  pageState: PageStateHandler,
  onComplete?: () => void,
) => {
  const btn = btnList[index];
  btn.classList.remove('lev-staggered-grayscale', 'lev-staggered-opacity');

  let audioAsset = mediaAssets.audio[camelize(audioList[index])];
  if (!audioAsset) {
    console.error('Audio Asset not available for:', audioList[index]);
    audioAsset = mediaAssets.audio.nullAudio;
  }

  const audioConfig: AudioConfigType = {
    restrictRepetition: {
      enabled: false,
      maxRepetitions: 2,
    },
    onEnded: () => {
      if (index + 1 === btnList?.length || !staggerEnabled) { // don't recurse if stagger is disabled
        // Last Element
        for (const jsResponseEl of btnList) {
          jsResponseEl.classList.remove('lev-staggered-disabled');
        }
        pageState.enableReplayBtn();
        onComplete?.();
      } else {
        //recurse
        showStaggeredBtnAndPlaySound(index + 1, btnList, audioList, pageState, onComplete);
      }
    },
  };

  PageAudioHandler.playAudio(audioAsset, audioConfig);
};

export const disableStagger = () => {
  staggerEnabled = false;
};
