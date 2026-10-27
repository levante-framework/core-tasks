import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import { Logger } from '../../../utils/logger';
import {
  addExperimenterButtons,
  addKeyHelpers,
  getParticipantUtilityButtonsHtml,
  PageAudioHandler,
  PageStateHandler,
  setupFullscreenButton,
  setupReplayAudio,
} from '../../shared/helpers';
import { isTouchScreen, jsPsych } from '../../taskSetup';
import { setupHafMultiResponseTouchRouting } from '../helpers/touchResponseRouting';
import {
  getCorrectInputSide,
  getStimulusLayout,
  type HaFStimulusType,
  InputKeyType,
  StimulusSideType,
} from '../helpers/utils';

/**
 * Builds a practice trial for the Instruction sections.
 * @param {*} stimulusType
 * @param {*} promptText
 * @param {*} promptAudioAsset
 * @param {*} stimulusSideType
 */
export function buildInstructionPracticeTrial(
  stimulusType: HaFStimulusType,
  promptText: string,
  promptAudioAsset: string,
  stimulusSideType: StimulusSideType,
  audioAssetKey: string,
) {
  if (!promptAudioAsset) {
    // throw new Error(`Missing prompt audio for instruction practice trial`);
    Logger.getInstance().error(new Error('buildInstructionPracticeTrial: Missing prompt audio'));
  }
  if (!promptText) {
    // throw new Error(`Missing prompt text for instruction practice trial`);
    Logger.getInstance().error(new Error('buildInstructionPracticeTrial: Missing prompt text'));
  }
  const replayButtonHtmlId = 'replay-btn-revisited';
  const validAnswer = getCorrectInputSide(stimulusType, stimulusSideType);
  const trial = {
    type: jsPsychHtmlMultiResponse,
    stimulus: () => {
      return getStimulusLayout(
        mediaAssets.images[stimulusType],
        stimulusSideType === StimulusSideType.Left,
        promptText,
        replayButtonHtmlId,
      );
    },
    prompt_above_buttons: true,
    on_start: () => {
      taskStore('stimulus', stimulusType);
      taskStore('stimulusSide', stimulusSideType);
    },
    on_load: () => {
      document.getElementById('jspsych-html-multi-response-stimulus')?.classList.add('haf-parent-container');
      document.getElementById('jspsych-html-multi-response-btngroup')?.classList.add('haf-parent-container');
      document.getElementById('jspsych-html-multi-response-btngroup')?.classList.add('lev-response-row');
      document.getElementById('jspsych-html-multi-response-btngroup')?.classList.add('linear-4');

      //TODO: use alt tag to query the proper button directly
      const buttons = document.querySelectorAll<HTMLElement>('.secondary--green');
      if (buttons.length !== 2) {
        Logger.getInstance().error(
          new Error(`There are ${buttons.length} instead of 2 wrappers in the practice trials`),
        );
      }
      buttons[validAnswer].style.animation = 'pulse 2s infinite';

      const audioConfig = {
        restrictRepetition: {
          enabled: true,
          maxRepetitions: 2,
        },
      };

      PageAudioHandler.playAudio(audioAssetKey, audioConfig, true, '.haf-stimulus-holder');
      const pageStateHandler = new PageStateHandler(audioAssetKey, true);
      setupReplayAudio(pageStateHandler);
      addExperimenterButtons();
      setupFullscreenButton();

      buttons.forEach((button, i) => {
        addKeyHelpers(button, i);
      });

      setupHafMultiResponseTouchRouting();
    },
    button_choices: [StimulusSideType.Left, StimulusSideType.Right],
    keyboard_choices: isTouchScreen ? InputKeyType.NoKeys : [InputKeyType.ArrowLeft, InputKeyType.ArrowRight],
    button_html: [
      `
    <div class='response-container--small'>
      <button class='secondary--green'></button>
    </div>`,
      `<div class='response-container--small'>
      <button class='secondary--green'></button>
    </div>`,
    ],
    on_finish: (data: Record<string, unknown>) => {
      PageAudioHandler.stopAndDisconnectNode();

      let response: number | InputKeyType | undefined;
      if (data.button_response === 0 || data.button_response === 1) {
        response = data.button_response;
      } else if (
        data.keyboard_response === InputKeyType.ArrowLeft ||
        data.keyboard_response === InputKeyType.ArrowRight
      ) {
        response = data.keyboard_response === InputKeyType.ArrowLeft ? 0 : 1;
      } else {
        const errorMessage = `Invalid response: ${data.button_response} or ${data.keyboard_response} in ${data}`;
        Logger.getInstance().error(new Error(errorMessage));
      }

      if (response === validAnswer) {
        taskStore('isCorrect', true);
      } else {
        taskStore('isCorrect', false);
      }

      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses,
        assessment_stage: 'practice_response',
      });
    },
    // TODO handle stimulus presentation timeout and other parameters
  };
  return trial;
}

/**
 * Builds the feedback shown after a practice answer with the given outcome. It only runs when the answer
 * had that outcome and getPromptKey returns a prompt (a blank feedback item means no feedback).
 * Correct feedback shows a smiling face with the prompt; incorrect feedback shows the stimulus again
 * with the correct button pulsing while the prompt plays.
 */
export function buildPracticeFeedback(outcome: 'correct' | 'incorrect', getPromptKey: () => string | undefined) {
  const isCorrectFeedback = outcome === 'correct';
  const validAnswerButtonHtmlIdentifier = 'valid-answer-btn';

  const trial = {
    type: jsPsychHtmlMultiResponse,
    stimulus: () => {
      const promptText = taskStore().translations[getPromptKey() ?? ''];
      if (isCorrectFeedback) {
        return `
          <div class='haf-cr-container'>
            <img src='${mediaAssets.images.smilingFace}' />
            <p class='lev-text h4 primary'>${promptText}</p>
          </div>
          ${getParticipantUtilityButtonsHtml('replay-btn-revisited', false)}
        `;
      }
      const imageSrc = mediaAssets.images[taskStore().stimulus];
      return getStimulusLayout(imageSrc, taskStore().stimulusSide === StimulusSideType.Left, promptText, undefined);
    },
    prompt_above_buttons: true,
    on_load: () => {
      addExperimenterButtons();
      setupFullscreenButton();

      document.getElementById('jspsych-html-multi-response-stimulus')?.classList.add('haf-parent-container');
      document.getElementById('jspsych-html-multi-response-btngroup')?.classList.add('haf-parent-container');
      document.getElementById('jspsych-html-multi-response-btngroup')?.classList.add('lev-response-row');
      document.getElementById('jspsych-html-multi-response-btngroup')?.classList.add('linear-4');
      const buttons = document.querySelectorAll<HTMLButtonElement>('.secondary--green');
      buttons.forEach((button, i) => {
        button.disabled = true;
        if (button.id === validAnswerButtonHtmlIdentifier) {
          button.style.animation = 'pulse 2s infinite';
        }
        addKeyHelpers(button, i);
      });

      const audioAssetKey = getPromptKey() ?? '';
      const audioConfig = {
        restrictRepetition: {
          enabled: true,
          maxRepetitions: 2,
        },
        onEnded: () => {
          jsPsych.finishTrial();
        },
      };
      PageAudioHandler.playAudio(audioAssetKey, audioConfig, true, '.haf-stimulus-holder');
      const pageStateHandler = new PageStateHandler(audioAssetKey, true);
      setupReplayAudio(pageStateHandler);
    },
    button_choices: [StimulusSideType.Left, StimulusSideType.Right],
    keyboard_choices: 'NO_KEYS',
    button_html: () => {
      if (!isCorrectFeedback) {
        const validAnswerPosition = getCorrectInputSide(taskStore().stimulus, taskStore().stimulusSide);
        return validAnswerPosition === 0 // is valid answer on the left?
          ? [
              `
          <div class='response-container--small'>
            <button class='secondary--green' id='${validAnswerButtonHtmlIdentifier}'></button>
          </div>
          `,
              `
          <div class='response-container--small'>
            <button class='secondary--green'></button>
          </div>
          `,
            ]
          : [
              `
          <div class='response-container--small'>
            <button class='secondary--green'></button>
          </div>
          `,
              `
          <div class='response-container--small'>
            <button class='secondary--green' id='${validAnswerButtonHtmlIdentifier}'></button>
          </div>
          `,
            ];
      } else {
        return `<button class='secondary--green' style='display: none;'></button>`;
      }
    },
    on_finish: () => {
      PageAudioHandler.stopAndDisconnectNode();
    },
  };

  return {
    timeline: [trial],
    conditional_function: () => (taskStore().isCorrect !== false) === isCorrectFeedback && Boolean(getPromptKey()),
  };
}
