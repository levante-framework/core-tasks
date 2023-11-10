import jsPsychCorsiBlocks from '@jspsych-contrib/plugin-corsi-blocks';
import { createGrid, generateRandomSequence } from '../helperFunctions';
import store from 'store2';

const age = store.session.get('config')?.userMetadata.age

// Calculate the x and y coordinates based off of number of blocks and the block size.
// The top left block corner should touch the container div

const x = 20
const y = 20
const numOfblocks = age > 6 ? 9 : 4
const blockSize = age > 6 ? 30: 40
const gridSize = age > 6 ? 3 : 2
const blockSpacing = 0.5
const sequenceLength = age > 6 ? 4 : 2
const grid = createGrid(x, y, numOfblocks, blockSize, gridSize, blockSpacing)
let generatedSequence = generateRandomSequence(numOfblocks, sequenceLength)


// 2 x 2
export const corsiBlocksDisplay = {
    type: jsPsychCorsiBlocks,
    sequence: generatedSequence,
    blocks: grid,
    prompt: 'Watch the blocks light up',
    mode: 'display',
    block_size: blockSize,
    display_width: '30rem',
    display_height: '30rem',
    // light gray
    block_color: '#878A8C',
    highlight_color: '#007fff',
}

export const corsiBlocks = {
    type: jsPsychCorsiBlocks,
    sequence: generatedSequence,
    blocks: grid,
    prompt: 'Select the squares in the order that was highlighted',
    mode: 'input',
    block_size: blockSize,
    display_width: '30rem',
    display_height: '30rem',
    // light gray
    block_color: '#878A8C',
    highlight_color: '#007fff',
    on_finish: () => generatedSequence = generateRandomSequence(numOfblocks, sequenceLength)
}