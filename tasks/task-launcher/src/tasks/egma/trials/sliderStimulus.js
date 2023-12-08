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

function getRandomValue(min, max, avoid) {
    let result;

    do {
        if (max === 1) {
            result = parseFloat((Math.random() * (max - min) + min).toFixed(2));
        } else {
            result = Math.floor(Math.random() * (max - min + 1)) + min;
        }
    } while (result === avoid);

    return result;
}

let sliderStart

export const slider = {
    type: HTMLSliderResponse,
    data: () => {
        return {
            save_trial: true,
            assessment_stage: store.session.get('nextStimulus').task
        }
    },
    stimulus: () => {
        const stim = store.session.get('nextStimulus')
        const prompt = stim.prompt
        if (prompt.includes('dot')) {
            return `${prompt} ${stim.answer}.`
        } else {
            return prompt
        }
    },
    labels: () => store.session.get('nextStimulus').item,
    // button_label: 'Continue',
    require_movement: () => store.session.get('nextStimulus').task === 'Number Line Slider',
    slider_width: 700,
    min: store.session.get('nextStimulus').item[0],
    max: store.session.get('nextStimulus').item[1],
    slider_start: () => {
        if (store.session.get('nextStimulus').prompt.includes('dot')){
            sliderStart = getRandomValue(store.session.get('nextStimulus').item[0], store.session.get('nextStimulus').item[1], store.session.get('nextStimulus').answer)
            console.log('slider start val in slider_start: ', sliderStart)
            return sliderStart
        } else {
            sliderStart = store.session.get('nextStimulus').answer
            console.log('slider start val in slider_start: ', sliderStart)
            return sliderStart
        }
    },
    step: 1,
    // response_ends_trial: true,
    on_load: () => {       
        console.log(store.session.get('nextStimulus'))
        // sliderVal = store.session.get('nextStimulus').answer

        const wrapper = document.getElementById('jspsych-html-slider-response-wrapper')
        const container = document.createElement('div')
        container.id = 'slider-btn-container'

        
        if (store.session.get('nextStimulus').task === 'Number Line 4afc') {
            const { answer, distractors } = store.session.get('nextStimulus')

            // const answer = 12
            // const distractors = [1,3,4]

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
            const slider = document.getElementById('jspsych-html-slider-response-response')

            slider.addEventListener('input', () => {
                    const sliderPrompt = document.getElementById('slider-val-prompt')
                    sliderPrompt.textContent = `Current value: ${slider.value}`
                }
            )

            const par = document.createElement('p')
            par.id = 'slider-val-prompt'
            par.textContent = `Current dot value: ${sliderStart}`
            container.appendChild(par)
        }


        wrapper.appendChild(container)
    },
    on_finish: (data) => {
        const stimulus = store.session.get('nextStimulus')

        data.correct = chosenAnswer ===  store.session.get('target')

        jsPsych.data.addDataToLastTrial({
            item: stimulus.item,
            answer: store.session("target"),
            response: chosenAnswer,
            sliderStart,
            // choices not being written for some reason >:(
            choices: stimulus.choices,
            distractors: stimulus.distractors,
          });
    }
}

