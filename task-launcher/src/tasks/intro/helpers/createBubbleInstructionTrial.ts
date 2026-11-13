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

/** Extra space inside the screen, on top of the float clearance. */
const EDGE_BUFFER = 40;

function toRect(element: Element | null): Rect | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

/** Usable bubble field and obstacles for the current viewport layout. */
function measureBubbleLayout(): { bounded: Rect; obstacles: Rect[] } | null {
  const field = toRect(document.querySelector('.jspsych-content'));
  if (!field) return null;

  const textObstacle = toRect(document.getElementById('bubble-instruction-text'));
  const obstacles = [
    textObstacle,
    toRect(document.querySelector('.participant-button-container')),
    toRect(document.querySelector('.experimenter-button-container')),
  ].filter((rect): rect is Rect => rect !== null);

  const bounded: Rect = {
    left: field.left + EDGE_BUFFER,
    right: field.right - EDGE_BUFFER,
    bottom: field.bottom - EDGE_BUFFER,
    top: Math.max(field.top + EDGE_BUFFER, textObstacle?.bottom ?? field.top),
  };
  if (bounded.top >= bounded.bottom || bounded.left >= bounded.right) return null;

  return { bounded, obstacles };
}

function pinInstructionText(text: HTMLElement) {
  const textRect = toRect(text);
  if (!textRect) return;
  text.classList.add('bubble-instruction-pinned');
  text.style.left = `${textRect.left}px`;
  text.style.top = `${textRect.top}px`;
  text.style.width = `${textRect.right - textRect.left}px`;
}

/** Re-measures in-flow layout, then re-applies the fixed pin for the current viewport. */
function repinInstructionText() {
  const text = document.getElementById('bubble-instruction-text');
  if (!text?.classList.contains('bubble-instruction-pinned')) return;

  text.classList.remove('bubble-instruction-pinned');
  text.style.left = '';
  text.style.top = '';
  text.style.width = '';
  pinInstructionText(text);
}

/** Updates bubble geometry only; leaves visibility (popped state) unchanged. */
function applyPlacedToLayer(layer: HTMLElement, placed: PlacedBubble[]): boolean {
  // Placement may drop bubbles on a very small viewport; keep the previous layout instead.
  if (placed.length !== layer.children.length) return false;

  for (let i = 0; i < placed.length; i++) {
    const bubble = layer.children[i] as HTMLElement;
    const slot = placed[i];
    bubble.style.left = `${slot.x}px`;
    bubble.style.top = `${slot.y}px`;
    bubble.style.width = `${slot.size}px`;
    bubble.style.height = `${slot.size}px`;
  }

  return true;
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
  let detachViewportListeners: (() => void) | undefined;

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

      const relayoutBubbles = () => {
        if (!active || !bubblesShown) return;

        const layer = document.getElementById('bubble-layer');
        if (!layer) return;

        repinInstructionText();

        const layout = measureBubbleLayout();
        if (!layout) return;

        const placed = options.placeBubbles(layout.bounded, layout.obstacles);
        if (!placed) return;

        applyPlacedToLayer(layer, placed);
      };

      let viewportRelayoutFrame = 0;

      const onViewportChange = () => {
        if (viewportRelayoutFrame) return;
        viewportRelayoutFrame = requestAnimationFrame(() => {
          viewportRelayoutFrame = 0;
          relayoutBubbles();
        });
      };

      const attachViewportListeners = () => {
        window.addEventListener('resize', onViewportChange);
        document.addEventListener('fullscreenchange', onViewportChange);
        detachViewportListeners = () => {
          window.removeEventListener('resize', onViewportChange);
          document.removeEventListener('fullscreenchange', onViewportChange);
          if (viewportRelayoutFrame) {
            cancelAnimationFrame(viewportRelayoutFrame);
            viewportRelayoutFrame = 0;
          }
        };
      };

      const showBubbles = () => {
        if (!active || bubblesShown) return;
        bubblesShown = true;

        const text = document.getElementById('bubble-instruction-text');
        if (text) pinInstructionText(text);
        document.getElementById('bubble-instruction-owl')?.remove();

        requestAnimationFrame(() => {
          if (!active) return;

          const layout = measureBubbleLayout();
          if (!layout) return;

          const placed = options.placeBubbles(layout.bounded, layout.obstacles);
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
          let remainingRequired = placed.filter((slot) => slot.required !== false).length;

          for (const slot of placed) {
            const bubble = document.createElement('button');
            bubble.type = 'button';
            bubble.className = 'img-transparent float';
            bubble.innerHTML = `<img src="${mediaAssets.images.bubble}" alt="" />`;

            wrapListeners(bubble, () => {
              PageAudioHandler.playAudio('pop', popAudioConfig);
              bubble.style.visibility = 'hidden';
              if (slot.required === false) return;
              remainingRequired--;
              if (remainingRequired === 0) {
                jsPsych.finishTrial();
              }
            });
            bubble.addEventListener('dragstart', (event) => {
              event.preventDefault();
            });
            layer.appendChild(bubble);
          }

          applyPlacedToLayer(layer, placed);
          attachViewportListeners();
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
      detachViewportListeners?.();
      detachViewportListeners = undefined;
      document.getElementById('bubble-layer')?.remove();
      PageAudioHandler.stopAndDisconnectNode();

      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses,
        assessment_stage: 'instructions',
      });
    },
  };
}
