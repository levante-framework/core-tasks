import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import { InputKey, getInputInstructPrompt } from '../helpers/utils';
import {
  setupReplayAudio,
  replayButtonSvg,
  PageStateHandler,
  PageAudioHandler,
  addKeyHelpers,
} from '../../shared/helpers';
import { jsPsych } from '../../taskSetup';
import { taskStore } from '../../../taskStore';
import { disableOkButton } from '../../shared/helpers/disableOkButton';
import { enableOkButton } from '../../shared/helpers/enableButtons';

let continueTrialConfig;

function isHfV2() {
  return taskStore().taskVersion === 2;
}

// These are the instruction "trials" they are full screen with no stimulus
export function getHeartInstructions() {
  return buildInstructionTrial(
    mediaAssets.images.animalBodySq,
    () => 'heartInstruct1',
    () => taskStore().translations.heartInstruct1,
  );
}

export function getFlowerInstructions() {
  return buildInstructionTrial(
    mediaAssets.images.animalBodySq,
    () => 'flowerInstruct1',
    () => taskStore().translations.flowerInstruct1,
  );
}

export function getTimeToPractice() {
  return buildInstructionTrial(
    mediaAssets.images.animalBodySq,
    () => 'heartsAndFlowersPracticeTime',
    () => taskStore().translations.heartsAndFlowersPracticeTime,
    taskStore().translations.heartsAndFlowersPressAnyKey,
  );
}

export function getKeepUp() {
  return buildInstructionTrial(
    mediaAssets.images.keepupSq,
    () => 'heartsAndFlowersInstruct1',
    () => taskStore().translations.heartsAndFlowersInstruct1,
  );
}

export function getKeepGoing() {
  return buildInstructionTrial(
    mediaAssets.images.rocketSq,
    () => 'heartsAndFlowersInstruct2',
    () => taskStore().translations.heartsAndFlowersInstruct2,
  );
}

export function getTimeToPlay() {
  return buildInstructionTrial(
    mediaAssets.images.animalBodySq,
    () => 'heartsAndFlowersPlayTime',
    () => taskStore().translations.heartsAndFlowersPlayTime,
  );
}

export function getMixedInstructions() {
  return buildInstructionTrial(
    mediaAssets.images.animalBodySq,
    () => 'heartsAndFlowersInstruct3',
    () => taskStore().translations.heartsAndFlowersInstruct3,
  );
}

export function getGoingFasterInstructions() {
  return buildInstructionTrial(
    mediaAssets.images.animalBodySq,
    () => 'heartsAndFlowersInstruct4',
    () => taskStore().translations.heartsAndFlowersInstruct4,
  );
}

export function getEndGame() {
  return buildInstructionTrial(
    mediaAssets.images.animalBodySq,
    () => 'heartsAndFlowersEnd',
    () => taskStore().translations.heartsAndFlowersEnd,
  );
}

export function getInputInstructions() {
  return buildInstructionTrial(
      mediaAssets.images.animalBodySq,
      getInputInstructPrompt,
      getInputInstructPrompt,
      true,
    );
}

function buildInstructionTrial(mascotImage, getPromptAudioKey, getPromptText, showResponseButtons = false) {
  if (!mascotImage) {
    console.error(`buildInstructionTrial: Missing mascot image`);
  }
  if (!getPromptAudioKey()) {
    console.error(`buildInstructionTrial: Missing prompt audio`);
  }
  if (!getPromptText()) {
    console.error(`buildInstructionTrial: Missing prompt text`);
  }

  const replayButtonHtmlId = 'replay-btn-revisited';
  let cleanupInstructionInputListeners = null;

  const trial = {
    type: jsPsychHtmlMultiResponse,
    stimulus: () => {
      // set the continue trial config based on the input capability
      continueTrialConfig = {
        type: taskStore().inputCapability?.touch || !isHfV2() ? 'button' : 'bottomText',
        text: taskStore().inputCapability?.touch || !isHfV2()
          ? taskStore().translations.continueButtonText
          : taskStore().translations.heartsAndFlowersPressAnyKey,
      };

      return `
        <div class="lev-stimulus-container">
            <button id="replay-btn-revisited" class="replay">
              ${replayButtonSvg}
            </button>
            <div id="instruction-text" class="lev-row-container instruction-small">
              <p>${getPromptText()}</p>
            </div>
            <div class="lev-stim-content-x-3">
              <img
                  src=${mascotImage}
                  alt='Instruction graphic'
              />
            </div>
            ${
              continueTrialConfig.type === 'bottomText'
                ? `<div class="lev-row-container header" ${showResponseButtons ? 'style="display: none;"' : ''}><p>${continueTrialConfig.text}</p></div>`
                : ''
            }
        </div>
        `;
    },
    prompt_above_buttons: true,
    keyboard_choices: showResponseButtons ? 'NO_KEYS' : 'ALL_KEYS',
    button_choices: () => continueTrialConfig.type === 'button' ? [continueTrialConfig.text] : undefined,
    button_html: () => continueTrialConfig.type === 'button' ? [`<button class="primary">%choice%</button>`]: undefined,
    on_load: () => {
      let responseButtons;
      let onButtonPress;
      let currentButtonToPress = 0;

      if (showResponseButtons) {
        if (continueTrialConfig.type === 'button') {
          disableOkButton();
          const okButton = document.querySelector('.primary');
          okButton.style.display = 'none';
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('lev-response-row');
        buttonContainer.classList.add('linear-4');
        buttonContainer.innerHTML = `
          <div class='response-container--small'>
            <button class='secondary--green'></button>
          </div>
          <div class='response-container--small'>
            <button class='secondary--green'></button>
          </div>`;

        const stimContainer = document.querySelector('.lev-stimulus-container');
        stimContainer.appendChild(buttonContainer);

        responseButtons = buttonContainer.querySelectorAll('.secondary--green');

        onButtonPress = (button, i, event) => {
          if (
            (
              (i === 0 && event.key === 'ArrowLeft') ||
              (i === 1 && event.key === 'ArrowRight') || 
              (event.type === 'touchend')
            ) && 
            currentButtonToPress === i
          ) {
            PageAudioHandler.playAudio(mediaAssets.audio.coin);
            button.classList.add('info-shadow');
            setTimeout(() => {
              button.classList.remove('info-shadow');
            }, 2000);
            button.style.animation = 'none';

            currentButtonToPress++;
            if (currentButtonToPress < responseButtons.length) { 
              responseButtons[currentButtonToPress].style.animation = 'pulse 2s infinite';
            } else {
              buttonContainer.style.display = 'none';
              
              if (continueTrialConfig.type === 'bottomText') {
                const bottomText = document.querySelector('.lev-row-container.header');
                bottomText.style.display = 'block';

                window.addEventListener('keydown', () => {
                  jsPsych.finishTrial();
                }, { once: true });
              } else {
                const okButton = document.querySelector('.primary');
                okButton.style.display = 'block';
                enableOkButton();
              }
            }
          }
        };
      }

      const audioConfig = {
        restrictRepetition: {
          enabled: false,
          maxRepetitions: 2,
        },
        onEnded: () => {
          if (!showResponseButtons) {
            return;
          }

          responseButtons[0].style.animation = 'pulse 2s infinite';
          responseButtons.forEach((button, i) => {
            addKeyHelpers(button, i);
          });

          if (taskStore().inputCapability?.touch) {
            responseButtons.forEach((button, i) => {
              button.addEventListener('touchend', (event) => {
                onButtonPress(button, i, event);
              }, { once: true });
            });
          } else {
            const onWindowKeydown = (event) => {
              const i = currentButtonToPress;
              if (i >= responseButtons.length) return;
              onButtonPress(responseButtons[i], i, event);
            };
            window.addEventListener('keydown', onWindowKeydown);
            cleanupInstructionInputListeners = () => {
              window.removeEventListener('keydown', onWindowKeydown);
            };
          }
        },
      };

      PageAudioHandler.playAudio(mediaAssets.audio[getPromptAudioKey()] || mediaAssets.audio.inputAudioCue, audioConfig);

      const pageStateHandler = new PageStateHandler(getPromptAudioKey());
      setupReplayAudio(pageStateHandler);
    },
    on_finish: () => {
      cleanupInstructionInputListeners?.();
      cleanupInstructionInputListeners = null;

      PageAudioHandler.stopAndDisconnectNode();

      if (getPromptAudioKey() === 'heartsAndFlowersEnd') {
        taskStore('taskComplete', true);
      }

      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses,
        assessment_stage: 'instructions',
      });
    },
  };
  return trial;
}
