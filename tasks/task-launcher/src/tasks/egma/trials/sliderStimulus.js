import HTMLSliderResponse from '@jspsych/plugin-html-slider-response';
import { shuffle } from '../../shared/helpers';
import _toNumber from 'lodash/toNumber'

let chosenAnswer

function captureValue(val) {
    chosenAnswer = _toNumber(val)
}

export const slider = {
    type: HTMLSliderResponse,
    stimulus: 'Choose the number that is marked on the number line.',
    labels: () => {
        const numberStrings = [];
        for (let i = 1; i <= 10; i++) {
            numberStrings.push(i.toString());
        }
        return ['1', '250', '500', '750', '1000']
        return numberStrings
    },
    // button_label: 'Continue',
    slider_width: 700,
    min: 1,
    max: 1000,
    slider_start: 258,
    step: 1,
    response_ends_trial: true,
    on_load: () => {
        const sliderEl = document.getElementById('jspsych-html-slider-response-response')
        sliderEl.style.width = '100%'

        const wrapper = document.getElementById('jspsych-html-slider-response-wrapper')
        const container = document.createElement('div')
        container.id = 'slider-btn-container'

        // const { answer, distractors } = store.session.get('nextStimulus')

        const answer = 12
        const distractors = [1,3,4]

        distractors.push(answer)

        const mixedOptions = shuffle(distractors)

        console.log({answer})
        console.log({mixedOptions})

        // create buttons

        for (let i = 0; i < mixedOptions.length; i++) {
            const btn = document.createElement('button')
            btn.textContent = mixedOptions[i]
            btn.addEventListener('click', () => captureValue(btn.textContent))
            container.appendChild(btn)
        }

        wrapper.appendChild(container)
    },
    on_finish: (data) => {
        data.chosenAnswer = chosenAnswer
    }
}

