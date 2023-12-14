import HTMLSliderResponse from '@jspsych/plugin-html-slider-response';
import _shuffle from 'lodash/shuffle'
import _toNumber from 'lodash/toNumber'
import { jsPsych } from '../../taskSetup';
import store from 'store2';
import { isPractice, updateProgressBar } from '../../shared/helpers';

let chosenAnswer, sliderStart, keyboardResponseMap = {}

function captureValue(btnElement, event) {
    if (event) {
        if (event.key === 'ArrowUp') {
            console.log('Up arrow key pressed');
        } else if (event.key === 'ArrowDown') {
            console.log('Down arrow key pressed');
        } else if (event.key === 'ArrowLeft') {
            console.log('Left arrow key pressed');
        } else if (event.key === 'ArrowRight') {
            console.log('Right arrow key pressed');
        }
    }

    let containerEl = document.getElementById('slider-btn-container') || null
    console.log({containerEl})

    if (!containerEl) {
        const layout = store.session('config').buttonLayout
        containerEl = document.getElementsByClassName(`${layout}-layout`)[0]
        console.log('container el by class: ', containerEl)
    }

    Array.from(containerEl.children).forEach(el => {
        el.children[0].id = ''
    })

    chosenAnswer = _toNumber(btnElement.textContent)

    if (chosenAnswer === 0 || chosenAnswer) {
        document.getElementById('jspsych-html-slider-response-next').disabled = false
    }

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
            assessment_stage: store.session.get('nextStimulus').task,
            isPracticeTrial: store.session.get("nextStimulus").notes === 'practice'
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
        const { buttonLayout, keyHelpers } = store.session.get("config")
        const distractors = store.session('nextStimulus')

        const wrapper = document.getElementById('jspsych-html-slider-response-wrapper')
        const buttonContainer = document.createElement('div')
        if (buttonLayout === 'default') {
            buttonContainer.id = 'slider-btn-container'
        }

        // don't apply layout if there aren't exactly 3 button options
        if (!(buttonLayout === 'triple' && distractors.length !== 2)) {
            buttonContainer.classList.add(`${buttonLayout}-layout`);
        }

        
        if (store.session.get('nextStimulus').task === 'Number Line 4afc') {
            // disable continue button until a choice is selected
            document.getElementById('jspsych-html-slider-response-next').disabled = true

            const { answer, distractors } = store.session.get('nextStimulus')

            distractors.push(answer)
            
            store.session.set('target', answer)
            store.session.set('choices', distractors)

            const mixedOptions = _shuffle(distractors)

            const arrowKeyEmojis = [
                ['arrowup', '↑'], 
                ['arrowleft', '←'], 
                ['arrowright', '→'], 
                ['arrowdown', '↓']
            ]

            const responseChoices = store.session('choices')

            // create buttons
            for (let i = 0; i < mixedOptions.length; i++) {
                const btnWrapper = document.createElement('div')
                const btn = document.createElement('button')
                btn.textContent = mixedOptions[i]
                btn.classList.add('math-btn')
                btn.addEventListener('click', () => captureValue(btn))
                document.addEventListener('keydown', (event) => captureValue(btn, event)) 

                if (!(buttonLayout === 'triple' && distractors.length !== 2)) {
                    if (buttonLayout === 'triple' || buttonLayout === 'diamond') {
                        btnWrapper.classList.add(`button${i + 1}`)
                    }
                    keyboardResponseMap[arrowKeyEmojis[i][0]] = responseChoices[i]

                    if (keyHelpers) { 
                        // Margin on the actual button element
                        btn.style.marginBottom = '.5rem'
              
                        const arrowKeyBorder = document.createElement('div')
                        arrowKeyBorder.classList.add('arrow-key-border')
              
                        const arrowKey = document.createElement('p')
                        arrowKey.textContent = arrowKeyEmojis[i][1]
                        arrowKey.style.textAlign = 'center'
                        arrowKey.style.fontSize = '1.5rem'
                        arrowKey.style.margin = '0'
                        arrowKeyBorder.appendChild(arrowKey)
                        btnWrapper.appendChild(btn)
                        btnWrapper.appendChild(arrowKeyBorder)
                    }
                }

                buttonContainer.appendChild(btnWrapper)
            }
        } else {
            const slider = document.getElementById('jspsych-html-slider-response-response')

            slider.addEventListener('input', () => chosenAnswer = slider.value)
        }

        wrapper.appendChild(buttonContainer)
    },
    on_finish: (data) => {
        const stimulus = store.session.get('nextStimulus')

        if (stimulus.task === 'Number Line 4afc') {
            data.correct = chosenAnswer ===  store.session.get('target')
        } else {
            // slider version is an approximation so we can't mark it as true/false
            data.correct = null
        }

        const response = stimulus.item[1] === 1 ? (chosenAnswer / 100) : chosenAnswer
        const responseType = stimulus.task.includes('4afc') ? 'afc' : 'slider'
        const answer = stimulus.answer
        

        console.log(stimulus.task)
        console.log({answer})
        console.log({response})
        console.log({responseType})
        console.log('correct: ', data.correct)

        console.log({chosenAnswer})
        console.log('chosen answer formatted: ', chosenAnswer / 100)

        jsPsych.data.addDataToLastTrial({
            item: stimulus.item,
            answer: answer,
            response: response,
            responseType: responseType,
            distractors: stimulus.distractors,
        });

        if (!isPractice(stimulus.notes)) {
            updateProgressBar();
        }
    }
}

