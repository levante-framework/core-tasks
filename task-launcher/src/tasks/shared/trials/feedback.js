import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response'
import { mediaAssets } from '../../..';
import { taskStore } from '../helpers';
import { camelize } from '@bdelab/roar-utils';

// isPractice parameter is for tasks that don't have a corpus (e.g. memory game)
export const feedback = (isPractice = false) => {
    return {
        timeline: [
            {
                type: jsPsychAudioMultiResponse,
                stimulus: () => {
                    const isCorrect = taskStore().isCorrect;
                    return (
                        isCorrect ? mediaAssets.audio.feedbackCorrect : mediaAssets.audio.feedbackTryAgain
                    )
                },
                prompt: () => {
                    const t = taskStore().translations;
                    const isCorrect = taskStore().isCorrect;
                    let promptOnIncorrect; // prompt displayed at bottom if incorrect, differs by task

                    switch(taskStore().task) {
                        case 'same-different-selection': 
                            promptOnIncorrect = 'Choose a shape that is the same.';
                            break; 
                        case 'memory-game': 
                            promptOnIncorrect = t.memoryGameForwardPrompt;
                            break; 
                        default: 
                            promptOnIncorrect = '';
                    }

                    return (
                        `<div id='stimulus-container'>
                            <div id='prompt-container-text'>
                                <p id='prompt'>${isCorrect ? t.feedbackCorrect : t.heartsAndFlowersTryAgain}</p>
                            </div>
                    
                            <img id='instruction-graphic' src=${isCorrect ? mediaAssets.images['smilingFace@2x'] : 
                                    mediaAssets.images['sadFace@2x']} alt='Instruction graphic'/>

                            ${isCorrect ? '' :
                             `<div id='prompt-container-text'>
                                <footer id='prompt'>${promptOnIncorrect}</footer>
                              </div>`
                            }
                        </div>`
                    )  
                },
                button_choices: ['Continue'], 
                keyboard_choices: 'NO_KEYS', 
                prompt_above_buttons: true, 
                button_html: () => {
                    const t = taskStore().translations;
                    return (`<button id="continue-btn">${t.continueButtonText}</button>`)
                }
            } 
        ],
        conditional_function: () => {
            return taskStore().nextStimulus?.notes === 'practice' || taskStore().nextStimulus?.trialType === 'practice' || isPractice
        },
    }
}
