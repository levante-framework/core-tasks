import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response'
import { mediaAssets } from '../../..';
import { taskStore } from '../helpers';
import { camelize } from '@bdelab/roar-utils';

// isPractice parameter is for tasks that don't have a corpus (e.g. memory game)
/*
export const feedback = (isPractice = false) => {
    return {
        timeline: [ 
            {
                type: jsPsychHTMLMultiResponse,
                stimulus: () => {
                    const t = taskStore().translations;
                    const isCorrect = taskStore().isCorrect;
                    let promptText

                    if (taskStore().task === 'memory-game'){
                        promptText = memoryGameInput; 
                    } else {
                        promptText = camelize(taskStore().nextStimulus.audioFile); 
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
                                <footer id='prompt'>${t[promptText]}</footer>
                              </div>`
                            }
                        </div>`
                    )  
                },
                button_choices: [`Continue`],
                keyboard_choices: 'ALL_KEYS',
                button_html: () => {
                    const t = taskStore().translations;
                    return (`<button class="primary">${t.continueButtonText}</button>`)
                }
            } 
        ],
        conditional_function: () => {
            return taskStore().nextStimulus?.notes === 'practice' || taskStore().nextStimulus?.trialType === 'practice' || isPractice
        },
    }
}
*/
export const feedback = (isPractice = false) => {
    return {
        timeline: [
            {
                type: jsPsychAudioMultiResponse,
                stimulus: () => {
                    const isCorrect = taskStore().isCorrect;
                    return (
                        isCorrect ? mediaAssets.audio.feedbackCorrect : mediaAssets.audio.memoryGameForwardPrompt
                    )
                },
                prompt: () => {
                    const t = taskStore().translations;
                    const isCorrect = taskStore().isCorrect;
                    return (
                        `<div id='stimulus-container'>
                            <div id='prompt-container-text'>
                                <p id='prompt'>${isCorrect ? t.feedbackCorrect : t.heartsAndFlowersTryAgain}</p>
                            </div>
                    
                            <img id='instruction-graphic' src=${isCorrect ? mediaAssets.images['smilingFace@2x'] : 
                                    mediaAssets.images['sadFace@2x']} alt='Instruction graphic'/>

                            ${isCorrect ? '' :
                             `<div id='prompt-container-text'>
                                <footer id='prompt'>${t.memoryGameForwardPrompt}</footer>
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
