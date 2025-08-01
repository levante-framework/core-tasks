import jsPsychCorsiBlocks from '@jspsych-contrib/plugin-corsi-blocks';
import { createGrid, generateRandomSequence } from '../helpers/grid';
import { jsPsych } from '../../taskSetup';
import _isEqual from 'lodash/isEqual';
import { finishExperiment } from '../../shared/trials';
import { mediaAssets } from '../../..';
import { getMemoryGameType } from '../helpers/getMemoryGameType';
import { setupReplayAudio, PageAudioHandler, replayButtonSvg, PageStateHandler } from '../../shared/helpers';
import { taskStore } from '../../../taskStore';

type CorsiBlocksArgs = {
  mode: 'display' | 'input';
  reverse?: boolean;
  isPractice?: boolean;
  resetSeq?: boolean;
};

const x = 20;
const y = 20;
const blockSpacing = 0.5;
let grid: { x: number; y: number }[];
let sequenceLength = 2;
let generatedSequence: number[] | null;
let selectedCoordinates: [number, number][] = [];
let numCorrect = 0;

// play audio cue
function setUpAudio(
  contentWrapper: HTMLDivElement,
  prompt: HTMLParagraphElement,
  reverse: boolean,
  mode: 'display' | 'input',
) {
  // add replay button
  const replayButton = document.createElement('button');
  replayButton.innerHTML = replayButtonSvg;
  replayButton.id = 'replay-btn-revisited';
  replayButton.classList.add('replay');
  replayButton.disabled = true;
  contentWrapper.insertBefore(replayButton, prompt);

  const inputAudioPrompt = reverse ? 'memoryGameBackwardPrompt' : 'memoryGameInput';
  const cue = mode === 'display' ? 'memoryGameDisplay' : inputAudioPrompt;

  const audioFile = mediaAssets.audio[cue] || '';
  const audioConfig: AudioConfigType = {
    restrictRepetition: {
      enabled: true,
      maxRepetitions: 2,
    },
    onEnded: () => {
      // set up replay button audio after the first audio has played
      if (cue) {
        const pageStateHandler = new PageStateHandler(cue, true);
        setupReplayAudio(pageStateHandler);
      }
    },
  };

  PageAudioHandler.playAudio(audioFile, audioConfig);
}

// This function produces both the display and input trials for the corsi blocks
export function getCorsiBlocks({ mode, reverse = false, isPractice = false, resetSeq = false }: CorsiBlocksArgs) {
  return {
    type: jsPsychCorsiBlocks,
    sequence: () => {
      // On very first trial, generate initial sequence
      if (!generatedSequence) {
        const numOfBlocks: number = Number(taskStore().numOfBlocks);
        generatedSequence = generateRandomSequence({ numOfBlocks, sequenceLength, previousSequence: null });
      }

      if (mode === 'input' && reverse) {
        return generatedSequence.reverse();
      } else {
        return generatedSequence;
      }
    },
    blocks: () => {
      if (!grid) {
        const { numOfBlocks, blockSize, gridSize } = taskStore();
        grid = createGrid({ x, y, numOfBlocks, blockSize, gridSize, blockSpacing });
      }
      return grid;
    },
    mode: mode,
    block_size: () => taskStore().blockSize,
    // light gray
    // Must be specified here as well as in the stylesheet. This is because
    // We need it for the initial render (our code) and when jspsych changes the color after highlighting.
    block_color: 'rgba(215, 215, 215, 0.93)',
    highlight_color: '#275BDD',
    // Show feedback only for practice
    correct_color: () => '#8CAEDF',
    incorrect_color: () => (isPractice ? '#f00' : '#8CAEDF'),
    post_trial_gap: 1000,
    data: {
      // not camelCase because firekit
      save_trial: true,
      assessment_stage: isPractice ? 'practice_response' : 'test_response',
      // not for firekit
      isPracticeTrial: isPractice,
      trialMode: mode,
    },
    on_load: () => doOnLoad(mode, isPractice, reverse),
    on_finish: (data: any) => {
      PageAudioHandler.stopAndDisconnectNode();

      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses,
      });

      if (resetSeq) {
        sequenceLength = 2;
      }

      const gridSize = taskStore().gridSize;

      // save itemUid for data analysis
      const itemUid = 'mg_' + `${reverse ? 'backward_' : 'forward_'}` + gridSize + 'grid_' + 'len' + sequenceLength;

      if (mode === 'input') {
        jsPsych.data.addDataToLastTrial({
          correct: _isEqual(data.response, data.sequence),
          selectedCoordinates: selectedCoordinates,
          corpusTrialType: getMemoryGameType(mode, reverse, gridSize),
          responseLocation: data.response,
          itemUid: itemUid,
          audioFile: reverse ? 'memory-game-backward-prompt' : 'memory-game-input',
        });
        taskStore('isCorrect', data.correct);

        if (data.correct && !isPractice) {
          numCorrect++;

          if (numCorrect === 3) {
            sequenceLength++;
            numCorrect = 0;
          }
        }

        if (!data.correct && !isPractice) {
          taskStore.transact('numIncorrect', (value: number) => value + 1);
          numCorrect = 0;
        }

        if (taskStore().numIncorrect === taskStore().maxIncorrect) {
          if (reverse) {
            finishExperiment();
          } else {
            sequenceLength = 2;
            // update total trials to account for skipped forward block
            taskStore('testTrialCount', 21);
          }
        }

        selectedCoordinates = [];

        const numOfBlocks = taskStore().numOfBlocks;

        // Avoid generating the same sequence twice in a row
        let newSequence = generateRandomSequence({
          numOfBlocks,
          sequenceLength,
          previousSequence: generatedSequence,
        });

        while (_isEqual(newSequence, generatedSequence)) {
          newSequence = generateRandomSequence({
            numOfBlocks,
            sequenceLength,
            previousSequence: generatedSequence,
          });
        }

        generatedSequence = newSequence;

        if (!isPractice) {
          timeoutIDs.forEach((id) => clearTimeout(id));
          timeoutIDs = [];

          taskStore.transact('testTrialCount', (oldVal: number) => oldVal + 1);
        }
      } else {
        jsPsych.data.addDataToLastTrial({
          correct: false, // default to false for display trials. Firekit requires this field to be non null.
          audioFile: 'memory-game-display',
        });
      }
    },
  };
}

let timeoutIDs: Array<NodeJS.Timeout | number> = [];

function doOnLoad(mode: 'display' | 'input', isPractice: boolean, reverse: boolean) {
  const container = document.getElementById('jspsych-corsi-stimulus') as HTMLDivElement;
  container.id = '';
  container.classList.add('lev-corsi-override');

  const gridSize = taskStore().gridSize;

  container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

  const t = taskStore().translations;

  if (!isPractice) {
    const toast = document.getElementById('lev-toast-default');

    // Avoid creating multiple toasts since we are adding it to the body
    // and it will not be removed from the DOM unlike jsPsych trials
    if (mode === 'input' && !toast) {
      const toast = document.createElement('div');
      toast.id = 'lev-toast-default';
      toast.classList.add('lev-toast-default');
      toast.textContent = t.generalEncourage;
      document.body.appendChild(toast);
    }
  }

  const blocks = document.getElementsByClassName('jspsych-corsi-block') as HTMLCollectionOf<HTMLDivElement>;

  Array.from(blocks).forEach((element, i) => {
    // Cannot just remove the id because the trial code uses that under the hood
    // so must remove css properties manually
    element.style.top = `unset`;
    element.style.left = `unset`;
    element.style.transform = `none`;
    element.style.position = `unset`;
    element.style.width = `unset`;
    element.style.height = `unset`;

    element.classList.add('lev-corsi-block-override');

    if (mode === 'input') {
      element.addEventListener('click', (event) => {
        selectedCoordinates.push([event.clientX, event.clientY]);

        if (!isPractice) {
          // Avoid stacking timeouts
          if (timeoutIDs.length) {
            timeoutIDs.forEach((id) => clearTimeout(id));
            timeoutIDs = [];
          }

          // start a timer for toast notification
          const toastTimer = setTimeout(() => {
            const toast = document.getElementById('lev-toast-default') as HTMLDivElement;
            toast.classList.add('show');
          }, 10000);

          const hideToast = setTimeout(() => {
            const toast = document.getElementById('lev-toast-default') as HTMLDivElement;
            toast.classList.remove('show');
          }, 13000);

          timeoutIDs.push(toastTimer);
          timeoutIDs.push(hideToast);
        }
      });

      if (window.Cypress && generatedSequence !== null) {
        const cypressData = {
          correctAnswer: generatedSequence,
        };

        window.cypressData = cypressData;
      }
    }
  });

  const contentWrapper = document.getElementById('jspsych-content') as HTMLDivElement;
  const corsiBlocksHTML = contentWrapper.children[1] as HTMLDivElement;
  const promptContainer = document.createElement('div');
  promptContainer.classList.add('lev-row-container', 'instruction');
  const prompt = document.createElement('p');
  const inputTextPrompt = reverse ? t.memoryGameBackwardPrompt : t.memoryGameInput;
  prompt.textContent = mode === 'display' ? t.memoryGameDisplay : inputTextPrompt;
  promptContainer.appendChild(prompt);
  // Inserting element at the second child position rather than
  // changing the jspsych-content styles to avoid potential issues in the future
  contentWrapper.insertBefore(promptContainer, corsiBlocksHTML);

  setUpAudio(contentWrapper, promptContainer, reverse, mode);
}
