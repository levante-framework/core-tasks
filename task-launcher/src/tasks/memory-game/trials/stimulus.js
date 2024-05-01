import jsPsychCorsiBlocks from '@jspsych-contrib/plugin-corsi-blocks';
import { createGrid, generateRandomSequence } from '../helpers/grid';
import store from 'store2';
import { jsPsych } from '../../taskSetup';
import _isEqual from 'lodash/isEqual';
import { finishExperiment } from '../../shared/trials';
import { mediaAssets } from '../../..';


const x = 20;
const y = 20;
const blockSpacing = 0.5;
let grid
// CHANGE BACK TO 2
let sequenceLength = 2;
let generatedSequence
let selectedCoordinates = [];
let numCorrect = 0;

// This function produces both the display and input trials for the corsi blocks
export function getCorsiBlocks({ mode, reverse = false, isPractice = false}) {
  return {
    type: jsPsychCorsiBlocks,
    sequence: () => {
      // On very first trial, generate initial sequence
      if (!generatedSequence) {
        const numOfblocks = store.session.get('memoryGameConfig').numOfblocks;
        generatedSequence = generateRandomSequence(numOfblocks, sequenceLength, true)
      }

      if (mode === 'input' && reverse) {
        return generatedSequence.reverse();
      } else {
        return generatedSequence;
      }
    },
    blocks: () => {
      if (!grid) {
        store.session.get('memoryGameConfig')
        const { numOfblocks, blockSize, gridSize } = store.session.get('memoryGameConfig');
        grid = createGrid(x, y, numOfblocks, blockSize, gridSize, blockSpacing)
      }
      return grid;
    },
    mode: mode,
    block_size: () => store.session.get('memoryGameConfig').blockSize,
    // light gray
    // Must be specified here as well as in the stylesheet. This is because
    // We need it for the initial render (our code) and when jspsych changes the color after highlighting.
    block_color: 'rgba(215, 215, 215, 0.93)',
    highlight_color: '#275BDD',
    // Show feedback only for practice
    correct_color: () => '#8CAEDF',
    incorrect_color: () => isPractice ? '#f00' : 'rgba(215, 215, 215, 0.93)',
    data: {
      // not camelCase because firekit
      save_trial: mode === 'input',
      assessment_stage: 'memory-game',
      // not for firekit
      isPracticeTrial: isPractice,
    },
    on_load: () => doOnLoad(mode, isPractice),
    on_finish: (data) => {
      if (mode === 'input') {
        jsPsych.data.addDataToLastTrial({
          correct: _isEqual(data.response, data.sequence),
          selectedCoordinates: selectedCoordinates
        });
        store.session.set('currentTrialCorrect', data.correct)

        if (data.correct && !isPractice) {
          store.session.set('incorrectTrials', 0)
          numCorrect++;

          if (numCorrect === 3) {
            sequenceLength++;
            numCorrect = 0;
          }
        }

        if (!data.correct && !isPractice) {
          store.session.transact('incorrectTrials', (value) => value + 1)
          numCorrect = 0;
        }

        if (store.session.get('incorrectTrials') == 3 || store.session.get('maxTimeReached')) {
          finishExperiment();
        }

        selectedCoordinates = [];

        const numOfblocks = store.session.get('memoryGameConfig').numOfblocks;

        // Avoid generating the same sequence twice in a row
        let newSequence = generateRandomSequence(
            numOfblocks, 
            sequenceLength, 
            isPractice
          );

        while (_isEqual(newSequence, generatedSequence)) {
          newSequence = generateRandomSequence(
            numOfblocks, 
            sequenceLength, 
            isPractice
          );
        }

        generatedSequence = newSequence;

        if (!isPractice) {
          timeoutIDs.forEach(id => clearTimeout(id));
          timeoutIDs = [];
        }
      }
    },
  };
}

let timeoutIDs = []

function doOnLoad(mode, isPractice) {
  const container = document.getElementById('jspsych-corsi-stimulus');
  container.id = '';
  container.classList.add('jspsych-corsi-overide');

  const gridSize = store.session.get('memoryGameConfig').gridSize;

  container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
  
  const t = store.session.get('translations');

  if (!isPractice) {
    const toast = document.getElementById('toast');

    // Avoid creating multiple toasts since we are adding it to the body
    // and it will not be removed from the DOM unlike jsPsych trials
    if (mode === 'input' && !toast) {
      const toast = document.createElement('div');
      toast.id = 'toast';
      toast.classList.add('toast');
      toast.textContent = t.generalEncourage;
      document.body.appendChild(toast);
    }
  }

  const blocks = document.getElementsByClassName('jspsych-corsi-block');

  Array.from(blocks).forEach((element, i) => {
    // Cannot just remove the id because the trial code uses that under the hood
    // so must remove css properties manually
    element.style.top = `unset`;
    element.style.left = `unset`;
    element.style.transform = `none`;
    element.style.position = `unset`;
    element.style.width = `unset`;
    element.style.height = `unset`;

    element.classList.add('jspsych-corsi-block-overide');

    if (mode === 'input') {
      element.addEventListener('click', (event) => {
        selectedCoordinates.push([event.clientX, event.clientY]);

        if (!isPractice) {
          // Avoid stacking timeouts
          if (timeoutIDs.length) {
            timeoutIDs.forEach(id => clearTimeout(id));
            timeoutIDs = [];
          }

          // start a timer for toast notification
          const toastTimer = setTimeout(() => {
            const toast = document.getElementById('toast');
            toast.classList.add('show');
          }, 10000);

          const hideToast = setTimeout(() => {
            const toast = document.getElementById('toast');
            toast.classList.remove('show');
          }, 13000);

          timeoutIDs.push(toastTimer);
          timeoutIDs.push(hideToast);
        }
      });
    }
  });

  if (isPractice) {
    const contentWrapper = document.getElementById('jspsych-content');
    const corsiBlocksHTML = contentWrapper.children[1];

    const prompt = document.createElement('p');
    prompt.classList.add('corsi-block-overide-prompt');
    prompt.textContent = mode === 'display' ? t.memoryGameDisplay : t.memoryGameInput;
    // Inserting element at the second child position rather than
    // changing the jspsych-content styles to avoid potential issues in the future
    contentWrapper.insertBefore(prompt, corsiBlocksHTML);
  }

  // play audio cue
  async function playAudioCue() {
    let audioSource

    const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();
  
    const cue = mode === 'display' ? 'displayAudioCue' : 'inputAudioCue';

    // Returns a promise of the AudioBuffer of the preloaded file path.
    const audioBuffer = await jsPsych
        .pluginAPI
        .getAudioBuffer(mediaAssets.audio[cue]);

    audioSource = jsPsychAudioCtx.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(jsPsychAudioCtx.destination);
    audioSource.start(0);
  }

  playAudioCue();
}
