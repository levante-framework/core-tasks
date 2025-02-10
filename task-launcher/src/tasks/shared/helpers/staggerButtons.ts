import { PageStateHandler } from "./PageStateHandler"; 
import { PageAudioHandler } from "./audioHandler";
import { mediaAssets } from "../../..";
import { camelize } from "./camelize";

export const handleStaggeredButtons = async (
    pageState: PageStateHandler, 
    buttonContainer: HTMLDivElement, 
    audioList: string[]
) => {
    const parentResponseDiv = buttonContainer;
    let i = 0;
    const stimulusDuration = await pageState.getStimulusDurationMs();
    const intialDelay = stimulusDuration + 300;

    // Disable the replay button till this animation is finished
    setTimeout(() => {
        pageState.disableReplayBtn();
    }, stimulusDuration + 110);

    for (const jsResponseEl of parentResponseDiv.children) {
    // disable the buttons so that they are not active during the animation
        jsResponseEl.classList.add(
            'lev-staggered-responses',
            'lev-staggered-disabled',
            'lev-staggered-grayscale',
            'lev-staggered-opacity',
        );
    }
      setTimeout(() => {
        showStaggeredBtnAndPlaySound(
          0,
          Array.from(parentResponseDiv?.children as HTMLCollectionOf<HTMLButtonElement>),
          audioList, 
          pageState,
        );
      }, intialDelay);
  };

const showStaggeredBtnAndPlaySound = (
    index: number,
    btnList: HTMLButtonElement[],
    audioList: string[],
    pageState: PageStateHandler,
  ) => {
    const btn = btnList[index];
    btn.classList.remove(
      'lev-staggered-grayscale',
      'lev-staggered-opacity',
    );
    
    let audioAsset = mediaAssets.audio[camelize(audioList[index])]
    if (!audioAsset) {
      console.error('Audio Asset not available for:', audioList[index]);
      audioAsset = mediaAssets.audio.nullAudio;
    }
  
    PageAudioHandler.playAudio(audioAsset, () => {
      if (index + 1 === btnList?.length) { // Last Element
        for (const jsResponseEl of btnList) {
          jsResponseEl.classList.remove('lev-staggered-disabled');
        }
        pageState.enableReplayBtn();
      } else { //recurse
        showStaggeredBtnAndPlaySound(index + 1, btnList, audioList, pageState);
      }
    });
  };