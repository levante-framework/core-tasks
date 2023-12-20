import HTMLSliderResponse from '@jspsych/plugin-html-slider-response';
import _shuffle from 'lodash/shuffle'
import _toNumber from 'lodash/toNumber'
import { jsPsych } from '../../taskSetup';
import store from 'store2';
import { isPractice, updateProgressBar } from '../../shared/helpers';

let chosenAnswer, sliderStart, keyboardResponseMap = {}

function captureValue(btnElement, event) {
    let containerEl = document.getElementById('slider-btn-container') || null

    if (!containerEl) {
        const layout = store.session('config').buttonLayout
        containerEl = document.getElementsByClassName(`${layout}-layout`)[0]
    }

    Array.from(containerEl.children).forEach(el => {
        el.children[0].id = ''
    })

    if (event?.key) {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

        chosenAnswer = _toNumber(keyboardResponseMap[event.key.toLowerCase()])

        // get button with response and add the selected id on it
        const responseBtns = Array.from(document.getElementsByClassName('math-btn'))
        const selectedBtn = responseBtns.find(el => _toNumber(el.textContent) === chosenAnswer)
        selectedBtn.id = 'selected-btn'

    } else {
        chosenAnswer = _toNumber(btnElement.textContent)
        btnElement.id = 'selected-btn'
    }


    if (chosenAnswer === 0 || chosenAnswer) {
        document.getElementById('jspsych-html-slider-response-next').disabled = false
        // Add event listener to continue button
    }
}

// Defining the function here since we need a reference to it to remove the event listener later
function captureBtnValue(event) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        captureValue(null, event)
    } else {
        jsPsych.finishTrial()
    }
}

function getRandomValue(max, avoid) {
    let result;

    do {
        // if (max === 1) {
        //     // Generate a random number between 0 and 1, with two decimal places
        //     result = Math.floor(Math.random() * 100);
        // } else {
        //     // Generate a random integer between 0 and max
            result = Math.floor(Math.random() * (max + 1));
        // }
    } while (result === avoid);

    return result;
}

export const slider = {
    type: HTMLSliderResponse,
    data: () => {
        return {
            save_trial: true,
            assessment_stage: store.session.get('nextStimulus').task,
            isPracticeTrial: store.session.get("nextStimulus").notes === 'practice'
        }
    },
    stimulus: () => {
        const stim = store.session.get('nextStimulus')
        const prompt = stim.prompt
        if (prompt.includes('dot')) {
            return (`
                <div id='stimulus-container'>
                    <p id=prompt>${prompt} ${stim.answer}.</p>
                </div>
            `)
        } else {
            return (`
                <div id='stimulus-container'>
                    <p id=prompt>${prompt}</p>
                </div>
            `)
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

        if (stim.task.includes('Slider')){
            const max = stim.item[1] === 1 ? 100 : stim.item[1]
            sliderStart = getRandomValue(max, stim.answer)
        } else {
            sliderStart = stim.answer < 1 ? stim.answer * 100 : stim.answer
        }

        return sliderStart
    },
    step: 1,
    // response_ends_trial: true,
    on_load: () => {       
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
            wrapper.style.margin = '0 0 2rem 0'

            // disable continue button until a choice is selected
            const continueBtn = document.getElementById('jspsych-html-slider-response-next')
            continueBtn.disabled = true

            if (keyHelpers) {
                const jsPsychContent = document.getElementById('jspsych-content')
                const spaceKeyHelperBorder = document.createElement('div')
                spaceKeyHelperBorder.classList.add('space-key-border')
                const spaceKeyHelper = document.createElement('p')
                spaceKeyHelper.textContent = 'Space'
                spaceKeyHelper.classList.add('space-key')
                spaceKeyHelperBorder.appendChild(spaceKeyHelper)
                jsPsychContent.appendChild(spaceKeyHelperBorder)
            }


            const { answer, distractors } = store.session.get('nextStimulus')

            distractors.push(answer)
            
            store.session.set('target', answer)
            store.session.set('choices', distractors)

            const arrowKeyEmojis = [
                ['arrowup', '↑'], 
                ['arrowleft', '←'], 
                ['arrowright', '→'], 
                ['arrowdown', '↓']
            ]

            const responseChoices = store.session('choices')

            // create buttons
            for (let i = 0; i < responseChoices.length; i++) {
                const btnWrapper = document.createElement('div')
                const btn = document.createElement('button')
                btn.textContent = responseChoices[i]
                btn.classList.add('math-btn')
                btn.addEventListener('click', () => captureValue(btn))
                if (i === 0) {
                    document.addEventListener('keydown', captureBtnValue) 
                }

                if (!(buttonLayout === 'triple' && distractors.length !== 2)) {
                    if (buttonLayout === 'triple' || buttonLayout === 'diamond') {
                        btnWrapper.classList.add(`button${i + 1}`)
                    }

                    keyboardResponseMap[arrowKeyEmojis[i][0]] = responseChoices[i]

                    btnWrapper.appendChild(btn)

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
        // Need to remove event listener after trial completion or they will stack and cause an error.
        document.removeEventListener('keydown', captureBtnValue)

        const stimulus = store.session.get('nextStimulus')

        if (stimulus.task === 'Number Line 4afc') {
            data.correct = chosenAnswer ===  store.session.get('target')
        } else {
            // slider version is an approximation so we can't mark it as true/false
            data.correct = null
        }

        const response = stimulus.task.includes('Slider') && stimulus.item[1] === 1 ? chosenAnswer / 100 : chosenAnswer
        const responseType = stimulus.task.includes('4afc') ? 'afc' : 'slider'
        const answer = stimulus.answer

        jsPsych.data.addDataToLastTrial({
            item: stimulus.item,
            answer: answer,
            response: _toNumber(response),
            responseType: responseType,
            distractors: stimulus.distractors,
            slider_start: stimulus.item[1] === 1 ? (sliderStart) / 100 : sliderStart,
        });

        if (!isPractice(stimulus.notes)) {
            updateProgressBar();
        }
    }
}

