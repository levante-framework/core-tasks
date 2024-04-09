import jsPsychCorsiBlocks from '@jspsych-contrib/plugin-corsi-blocks';
import { createGrid, generateRandomSequence } from '../helpers/grid';
import store from 'store2';
import { jsPsych } from '../../taskSetup';
import _isEqual from 'lodash/isEqual';

const age = store.session.get('config')?.userMetadata.age;

const x = 20;
const y = 20;
const numOfblocks = age > 6 ? 9 : 4;
const blockSize = age > 6 ? 30 : 50;
const gridSize = age > 6 ? 3 : 2;
const blockSpacing = 0.5;
const sequenceLength = age > 6 ? 4 : 2;
const grid = createGrid(x, y, numOfblocks, blockSize, gridSize, blockSpacing);
let generatedSequence = generateRandomSequence(numOfblocks, sequenceLength);
let selectedCoordinates = [];

// This function produces both the display and input trials for the corsi blocks
export function getCorsiBlocks({mode}) {
  return {
    type: jsPsychCorsiBlocks,
    sequence: () => generatedSequence,
    blocks: () => grid,
    mode: mode,
    block_size: blockSize,
    // light gray
    // Must be specified here as well as in the stylesheet. This is because
    // We need it for the initial render (our code) and when jspsych changes the color after highlighting.
    block_color: 'rgba(215, 215, 215, 0.93)',
    highlight_color: '#275BDD',
    data: {
      // not camelCase because firekit
      save_trial: mode === 'input',
      assessment_stage: 'memory-game',
      // not for firekit

      // TBD: Will memory game have practice trials?
      // isPracticeTrial: true,
    },
    on_load: () => doOnLoad(mode),
    on_finish: (data) => {
      if (mode === 'input') {
        jsPsych.data.addDataToLastTrial({
          correct: _isEqual(data.response, data.sequence),
          selectedCoordinates: selectedCoordinates
        });
        selectedCoordinates = [];

        generatedSequence = generateRandomSequence(numOfblocks, sequenceLength);
      }
    },
  }
} 

function doOnLoad(mode) {
  const container = document.getElementById('jspsych-corsi-stimulus');
  container.id = '';
  container.classList.add('jspsych-corsi-overide');

  container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

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
        selectedCoordinates.push([event.clientX, event.clientY])
      })
    }
  });

  const contentWrapper = document.getElementById('jspsych-content');
  const corsiBlocksHTML = contentWrapper.children[1];

  const prompt = document.createElement('p');
  prompt.classList.add('corsi-block-overide-prompt')
  prompt.textContent = mode === 'display' ? 'Watch the blocks light up' : 'Select the squares in the order that was highlighted';
  // Inserting element at the second child position rather than
  // changing the jspsych-content styles to avoid potential issues in the future
  contentWrapper.insertBefore(prompt, corsiBlocksHTML);
}