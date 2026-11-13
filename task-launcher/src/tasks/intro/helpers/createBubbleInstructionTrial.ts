import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import {
  addExperimenterButtons,
  getParticipantUtilityButtonsHtml,
  PageAudioHandler,
  PageStateHandler,
  setupFullscreenButton,
  setupReplayAudio,
  wrapListeners,
} from '../../shared/helpers';
import { jsPsych } from '../../taskSetup';
import type { PlacedBubble, Rect } from '../helpers/placeBubblesAround';

function toRect(element: Element | null): Rect | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

/**
 * Instruction text and owl, then bubbles in the owl's place once the audio ends.
 * The text stays put and the replay button keeps working.
 */
export function createBubbleInstructionTrial(options: {
  prompt: () => string;
  placeBubbles: (field: Rect, obstacles: Rect[]) => PlacedBubble[] | null;
}) {
  let active = false;
  let revealTimeout: ReturnType<typeof setTimeout> | undefined;

  return {
    type: jsPsychHtmlMultiResponse,
    stimulus: () => {
      const t = taskStore().translations;
      const prompt = options.prompt();

      return `
        <div class="lev-stimulus-container">
          ${getParticipantUtilityButtonsHtml('replay-btn-revisited', true)}
          <div id="bubble-instruction-text" class="lev-row-container instruction-small">
            <p>${t[prompt]}</p>
          </div>
          <div id="bubble-instruction-owl" class="lev-stim-content-x-3">
            <img src="${mediaAssets.images.avatarOwl}" alt="Instruction graphic" />
          </div>
        </div>
      `;
    },
    keyboard_choices: 'NO_KEYS',
    on_load: () => {
      active = true;
      addExperimenterButtons();
      setupFullscreenButton();

      const prompt = options.prompt();
      let bubblesShown = false;

      const showBubbles = () => {
        if (!active || bubblesShown) return;
        bubblesShown = true;

        const text = document.getElementById('bubble-instruction-text');
        const textRect = toRect(text);
        if (text && textRect) {
          text.classList.add('bubble-instruction-pinned');
          text.style.left = `${textRect.left}px`;
          text.style.top = `${textRect.top}px`;
          text.style.width = `${textRect.right - textRect.left}px`;
        }
        document.getElementById('bubble-instruction-owl')?.remove();

        requestAnimationFrame(() => {
          if (!active) return;

          const field = toRect(document.querySelector('.jspsych-content'));
          if (!field) return;

          const obstacles = [
            toRect(document.getElementById('bubble-instruction-text')),
            toRect(document.querySelector('.participant-button-container')),
            toRect(document.querySelector('.experimenter-button-container')),
          ].filter((rect): rect is Rect => rect !== null);

          const placed = options.placeBubbles(field, obstacles);
          if (!placed) return;

          const layer = document.createElement('div');
          layer.id = 'bubble-layer';
          layer.className = 'bubble-around-layer';
          document.querySelector('.jspsych-content')?.appendChild(layer);

          const popAudioConfig: AudioConfigType = {
            restrictRepetition: {
              enabled: false,
            },
          };
          let remainingBubbles = placed.length;

          for (const slot of placed) {
            const bubble = document.createElement('button');
            bubble.type = 'button';
            bubble.className = 'img-transparent float';
            bubble.style.left = `${slot.x}px`;
            bubble.style.top = `${slot.y}px`;
            bubble.style.width = `${slot.size}px`;
            bubble.style.height = `${slot.size}px`;
            bubble.innerHTML = `<img src="${mediaAssets.images.bubble}" alt="" />`;

            wrapListeners(bubble, () => {
              PageAudioHandler.playAudio('pop', popAudioConfig);
              bubble.style.visibility = 'hidden';
              remainingBubbles--;
              if (remainingBubbles === 0) {
                jsPsych.finishTrial();
              }
            });
            bubble.addEventListener('dragstart', (event) => {
              event.preventDefault();
            });
            layer.appendChild(bubble);
          }
        });
      };

      const audioConfig: AudioConfigType = {
        restrictRepetition: {
          enabled: true,
          maxRepetitions: 2,
        },
        onEnded: showBubbles,
      };
      PageAudioHandler.playAudio(prompt, audioConfig);

      const pageStateHandler = new PageStateHandler(prompt, true);
      setupReplayAudio(pageStateHandler);
      pageStateHandler
        .getStimulusDurationMs()
        .then((durationMs) => {
          revealTimeout = setTimeout(showBubbles, durationMs + 250);
        })
        .catch(() => {
          showBubbles();
        });
    },
    on_finish: () => {
      active = false;
      clearTimeout(revealTimeout);
      document.getElementById('bubble-layer')?.remove();
      PageAudioHandler.stopAndDisconnectNode();

      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses,
        assessment_stage: 'instructions',
      });
    },
  };
}
