import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response'
import { mediaAssets } from '../../..'
import { jsPsych } from '../../taskSetup'
import store from 'store2'

export const stimulus = (isPractice = false, stage) => {
    return {
        type: jsPsychHTMLMultiResponse,
        data: () => {
            return {
              // not camelCase because firekit
              save_trial: true,
              assessment_stage: stage,
              // not for firekit
              isPracticeTrial: isPractice,
            }
          },
        stimulus: () => {
            return (
                `<div id='stimulus-container-hf'>
                    <div class='stimulus'>
                        ${jsPsych.timelineVariable('position') <= 0.5 ? `<img src=${mediaAssets.images[jsPsych.timelineVariable('stimulus')]} alt="heart or flower"/>` : ''}
                    </div>
                    <div class='stimulus'>
                        ${jsPsych.timelineVariable('position') > 0.5 ? `<img src=${mediaAssets.images[jsPsych.timelineVariable('stimulus')]} alt="heart or flower"/>` : ''}
                    </div>
                </div>`
            )
        },
        on_load: () => {
            // console.log('stim timeline var:', jsPsych.timelineVariable('stimulus'))
            console.log('position timeline var:', jsPsych.timelineVariable('position'))

            document.getElementById('jspsych-html-multi-response-btngroup').classList.add('btn-layout-hf')
        },
        button_choices: ['left', 'right'],
        keyboard_choice: ['ArrowLeft', 'ArrowRight'],
        button_html: [`<div class='response-btn'></div>`, `<div class='response-btn'></div>`],
        on_finish: (data) => {
            let response

            if (data.button_response || data.button_response === 0) {
                response = data.button_response
            } else {
                response = data.keyboard_response === 'ArrowLeft' ? 0 : 1
            }

            data.correct = jsPsych.timelineVariable('position') === response

            jsPsych.data.addDataToLastTrial({
                item: jsPsych.timelineVariable('stimulus'),
                side: jsPsych.timelineVariable('position') <= 0.5 ? 'left' : 'right',
                answer: jsPsych.timelineVariable('position'),
                response,
              });
        },

        // DEFAULTS
        // stimulus_duration: null,
        // trial_duration: null,
        // response_ends_trial: true,
    }
}