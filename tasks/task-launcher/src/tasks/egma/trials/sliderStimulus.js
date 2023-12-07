import HTMLSliderResponse from '@jspsych/plugin-html-slider-response';
import _shuffle from 'lodash/shuffle'
import _toNumber from 'lodash/toNumber'
import { jsPsych } from '../../taskSetup';
import store from 'store2';

let chosenAnswer

function captureValue(btnElement) {
    const containerEl = document.getElementById('slider-btn-container')
    Array.from(containerEl.children).forEach(el => {
        el.id = ''
    })

    chosenAnswer = _toNumber(btnElement.textContent)
    btnElement.id = 'selected-btn'
}

export const slider = {
    type: HTMLSliderResponse,
    data: () => {
        return {
            save_trial: true,
            assessment_stage: store.session.get('nextStimulus').task
        }
    },
    stimulus: 'Move the slider to 7.',
    // stimulus: 'Choose the number that is marked on the number line.',
    labels: () => {
        const range = store.session.get('nextStimulus').item
        console.log({range})

        const numberStrings = [];

        const max = range[1]

        console.log({max})

        for (let i = 0; i <= max; i+= (max / 10)) {
            numberStrings.push(i.toString());
        }

        // return ['1', '250', '500', '750', '1000']
        return numberStrings
    },
    // button_label: 'Continue',
    // require_movement: store.session.get('nextStimulus).task === 'Number Line slider'
    slider_width: 700,
    // min: store.session.get('nextStimulus').item[0],
    min: 0,
    // max: store.session.get('nextStimulus').item[1],
    max: 10,
    slider_start: 2.58,
    // slide_start: store.session.get('nextStimulus').answer
    step: 1,
    // response_ends_trial: true,
    on_load: () => {
        // sliderVal = store.session.get('nextStimulus').answer

        const slider = document.getElementById('jspsych-html-slider-response-response')

        slider.addEventListener('input', () => {
                const sliderPrompt = document.getElementById('slider-val-prompt')
                sliderPrompt.textContent = `Current value: ${slider.value}`
            }
        )


        const wrapper = document.getElementById('jspsych-html-slider-response-wrapper')
        const container = document.createElement('div')
        container.id = 'slider-btn-container'

        
        if (store.session.get('nextStimulus').task === 'Number Line 4afc') {
            // const { answer, distractors } = store.session.get('nextStimulus')

            const answer = 12
            const distractors = [1,3,4]

            distractors.push(answer)
            
            store.session.set('target', answer)
            store.session.set('choices', distractors)

            const mixedOptions = _shuffle(distractors)

            // create buttons
            for (let i = 0; i < mixedOptions.length; i++) {
                const btn = document.createElement('button')
                btn.textContent = mixedOptions[i]
                btn.addEventListener('click', () => captureValue(btn))
                container.appendChild(btn)
            }
        } else {
            const par = document.createElement('p')
            par.id = 'slider-val-prompt'
            par.textContent = `Current value: ${store.session.get('nextStimulus')?.startSlider || 2.58}`
            container.appendChild(par)
        }


        wrapper.appendChild(container)
    },
    on_finish: (data) => {
        const stimulus = store.session.get('nextStimulus')

        data.correct = chosenAnswer ===  store.session.get('target')

        jsPsych.data.addDataToLastTrial({
            // specific to this trial
            item: stimulus.item,
            answer: store.session("target"),
            response: chosenAnswer,
            // choices not being written for some reason >:(
            choices: stimulus.choices,
            distractors: stimulus.distractors,
          });
    }
}

