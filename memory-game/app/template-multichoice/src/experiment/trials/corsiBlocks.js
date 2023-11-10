import jsPsychCorsiBlocks from '@jspsych-contrib/plugin-corsi-blocks';
import { createGrid } from '../helperFunctions';
import store from 'store2';

let age = store.session.get('config').userMetadata.age
console.log({age})

let x = 40
let y = 50
let numOfblocks = age > 6 ? 9 : 4
let blockSize = age > 6 ? 30: 40
let gridSize = age > 6 ? 3 : 2

console.log({blockSize})

// 2 x 2
export const corsiBlocksDisplay = {
    type: jsPsychCorsiBlocks,
    sequence: [0, 1, 2, 3,],
    blocks: createGrid(x, y, numOfblocks, blockSize, gridSize),
    prompt: 'Watch the blocks light up',
    mode: 'display',
    block_size: blockSize,
    display_width: '25rem',
    display_height: '25rem'
}

export const corsiBlocks = {
    type: jsPsychCorsiBlocks,
    sequence: [0, 1, 2, 3,],
    blocks: createGrid(x, y, numOfblocks, blockSize, gridSize),
    prompt: 'Select the right blocks',
    mode: 'input',
    block_size: blockSize,
    display_width: '25rem',
    display_height: '25rem'
}




// export const corsiBlocks3x3 = {
//     type: jsPsychCorsiBlocks,
//     sequence: [0, 1, 2, 3,4,5,6,7,8],
//     blocks: [
//              {x: 40, y: 50}, {x: 40, y: 62}, {x: 40, y: 74},
//              {x: 52, y: 50}, {x: 52, y: 62}, {x: 52, y: 74},
//              {x: 64, y: 50}, {x: 64, y: 62}, {x: 64, y: 74}
//             ],
//     prompt: 'Select the right blocks',
//     mode: 'input',
//     block_size: 25rem,
// }