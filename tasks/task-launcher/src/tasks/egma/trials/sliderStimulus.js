import HTMLSliderResponse from '@jspsych/plugin-html-slider-response';
import _shuffle from 'lodash/shuffle'
import _toNumber from 'lodash/toNumber'
import { jsPsych } from '../../taskSetup';
import store from 'store2';

let chosenAnswer, sliderStart

function captureValue(btnElement) {
    const containerEl = document.getElementById('slider-btn-container')
    Array.from(containerEl.children).forEach(el => {
        el.id = ''
    })

    chosenAnswer = _toNumber(btnElement.textContent)
    btnElement.id = 'selected-btn'
}

function getRandomValue(max, avoid) {
    let result;

    do {
        if (max === 1) {
            // Generate a random number between 0 and 1, with two decimal places
            result = Math.floor(Math.random() * 100);
        } else {
            // Generate a random integer between 0 and max
            result = Math.floor(Math.random() * (max + 1));
        }
    } while (result === avoid);

    return result;
}

export const slider = {
    type: HTMLSliderResponse,
    data: () => {
        return {
            // save_trial: true,
            assessment_stage: store.session.get('nextStimulus').task
        }
    },
    stimulus: () => {
        const stim = store.session.get('nextStimulus')
        const prompt = stim.prompt
        if (prompt.includes('dot')) {
            return `<p id=prompt>${prompt} ${stim.answer}.</p>`
        } else {
            return `<p id=prompt>${prompt}</p>`
        }
    },
    labels: () => store.session.get('nextStimulus').item,
    // button_label: 'Continue',
    require_movement: () => store.session.get('nextStimulus').task === 'Number Line Slider',
    slider_width: 800,
    min: () => store.session.get('nextStimulus').item[0],
    max: () => store.session.get('nextStimulus').item[1] === 1 ? 100 : store.session.get('nextStimulus').item[1],
    slider_start: () => {
        const stim = store.session.get('nextStimulus')

        if (store.session.get('nextStimulus').prompt.includes('dot')){
            sliderStart = getRandomValue(stim.item[1], stim.answer)
            return sliderStart
        } else {
            sliderStart = store.session.get('nextStimulus').answer
            return sliderStart
        }
    },
    step: 1,
    // response_ends_trial: true,
    on_load: () => {       
        // console.log(store.session.get('nextStimulus'))
        const  sliderLabels = document.getElementsByTagName('span')
        Array.from(sliderLabels).forEach((el, i) => {
            if (i == 1 || i == 2) {
                el.style.fontSize = '1.5rem'
            }
        })

        const wrapper = document.getElementById('jspsych-html-slider-response-wrapper')
        const container = document.createElement('div')
        container.id = 'slider-btn-container'

        
        if (store.session.get('nextStimulus').task === 'Number Line 4afc') {
            const { answer, distractors } = store.session.get('nextStimulus')

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

            slider.addEventListener('input', () => chosenAnswer = slider.value)
        }

        wrapper.appendChild(container)
    },
    on_finish: (data) => {
        const stimulus = store.session.get('nextStimulus')

        data.correct = chosenAnswer ===  store.session.get('target')

        console.log('chosen answer formatted: ', chosenAnswer / 100)

        jsPsych.data.addDataToLastTrial({
            item: stimulus.item,
            answer: store.session("target"),
            response: store.session.get('nextStimulus').item[1] === 1 ? (chosenAnswer / 100) : chosenAnswer,
            sliderStart,
            // choices not being written for some reason >:(
            choices: stimulus.choices || null,
            distractors: stimulus.distractors || null,
          });
    }
}

