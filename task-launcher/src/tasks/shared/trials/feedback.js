import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import { taskStore } from '../helpers';

// isPractice parameter is for tasks that don't have a corpus (e.g. memory game)
export const feedback = (isPractice = false) => {
    return {
        timeline: [ 
            {
                type: jsPsychHTMLMultiResponse,
                stimulus: () => {
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
