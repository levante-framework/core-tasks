import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import store from 'store2';
import { mediaAssets } from '../../..';

// isPractice parameter is for tasks that don't have a corpus (e.g. memory game)
export const feedback = (isPractice = false) => {
    return {
        timeline: [ 
            {
                type: jsPsychHTMLMultiResponse,
                stimulus: () => {
                    const t = store.session.get('translations');
                    const isCorrect = store.session.get('currentTrialCorrect');
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
                    const t = store.session.get('translations');
                    return (`<button id="continue-btn">${t.continueButtonText}</button>`)
                }
            } 
        ],
        conditional_function: () => store.session.get('stimulus')?.notes === 'practice' || isPractice
    }
}