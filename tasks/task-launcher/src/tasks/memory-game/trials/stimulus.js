import jsPsychCorsiBlocks from '@jspsych-contrib/plugin-corsi-blocks';
import { createGrid, generateRandomSequence } from '../helpers/grid';
import store from 'store2';
import { jsPsych } from '../../taskSetup';


const age = store.session.get('config')?.userMetadata.age

const x = 20
const y = 20
const numOfblocks = age > 6 ? 9 : 4
const blockSize = age > 6 ? 30: 50
const gridSize = age > 6 ? 3 : 2
const blockSpacing = 0.5
const sequenceLength = age > 6 ? 4 : 2
const grid = createGrid(x, y, numOfblocks, blockSize, gridSize, blockSpacing)
let generatedSequence = generateRandomSequence(numOfblocks, sequenceLength)


export const corsiBlocksDisplay = {
    type: jsPsychCorsiBlocks,
    sequence: generatedSequence,
    blocks: () => grid,
    mode: 'display',
    block_size: blockSize,
    // light gray
    block_color: '#878A8C',
    highlight_color: '#007fff',
    data: {
        assessment_stage: 'dev'
    },
    on_load: () => {
        const container = document.getElementById('jspsych-corsi-stimulus')
        container.id = ''
        container.classList.add('jspsych-corsi-overide')

        container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        container.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        const blocks = document.getElementsByClassName('jspsych-corsi-block')

        Array.from(blocks).forEach((element, i) => {
            // Cannot just remove the id because the trial code uses that under the hood
            // so must remove css properties manually
            element.style.top = `unset`
            element.style.left = `unset`
            element.style.transform = `none`
            element.style.position = `unset`
            element.style.width = `unset`
            element.style.height = `unset`

            element.classList.add('jspsych-corsi-block-overide')
        });

        const contentWrapper = document.getElementById('jspsych-content')

        const prompt = document.createElement('p')
        prompt.textContent = 'Watch the blocks light up'
        contentWrapper.appendChild(prompt)
    },
    on_finish: () => {
        jsPsych.data.addDataToLastTrial({
            correct: 'sure'
        })
    }
}

export const corsiBlocks = {
    type: jsPsychCorsiBlocks,
    sequence: generatedSequence,
    blocks: grid,
    mode: 'input',
    block_size: blockSize,
    // light gray
    block_color: '#878A8C',
    highlight_color: '#007fff',
    data: {
        assessment_stage: 'dev'
    },
    on_load: () => {
        const container = document.getElementById('jspsych-corsi-stimulus')
        container.id = ''
        container.classList.add('jspsych-corsi-overide')

        container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        container.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        const blocks = document.getElementsByClassName('jspsych-corsi-block')

        Array.from(blocks).forEach((element, i) => {
            element.style.top = `unset`
            element.style.left = `unset`
            element.style.transform = `none`
            element.style.position = `unset`
            element.style.width = `unset`
            element.style.height = `unset`

            element.classList.add('jspsych-corsi-block-overide')
        });

        const contentWrapper = document.getElementById('jspsych-content')

        const prompt = document.createElement('p')
        prompt.textContent = 'Select the squares in the order that was highlighted'
        contentWrapper.appendChild(prompt)
    },
    on_finish: () => {
        jsPsych.data.addDataToLastTrial({
            correct: 'sure'
        })
        generatedSequence = generateRandomSequence(numOfblocks, sequenceLength)
    },
}