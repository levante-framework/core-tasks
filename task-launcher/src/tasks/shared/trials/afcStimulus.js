// For Matrix reasoning, TROG, Theory of mind, Mental rotation, and EGMA Math
// Currently works in: TROG, Theory of mind

import jsPsychAudioMultiResponse from "@jspsych-contrib/plugin-audio-multi-response";
import jsPsychHTMLMultiResponse from "@jspsych-contrib/plugin-html-multi-response"
import store from "store2";
import { jsPsych } from "../../taskSetup";
import { prepareChoices, updateProgressBar, addItemToSortedStoreList, isPractice } from "../../shared/helpers";
import { mediaAssets } from "../../..";
import _toNumber from 'lodash/toNumber'
import { camelize } from "@bdelab/roar-utils";

let audioSource;
let keyboardResponseMap = {}

function getStimulus(trialType) {
    if (trialType === 'audio') {
        const stim = store.session.get("nextStimulus")
        if (stim.task === 'Number Identification') {
            // For testing, in case audio isnt defined
            return mediaAssets.audio[stim.item] || mediaAssets.audio.nullAudio
        } else {
            return mediaAssets.audio.nullAudio
        }
    } else {
        const stim = store.session.get("nextStimulus")
        return (`
            <div id='stimulus-container'>
            <p id="prompt">${stim.item}</p>
            <br>
            <img id="stimulus-img" src=${ mediaAssets.images[store.session.get('nextStimulus').image] || `https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc`}  alt=${ store.session.get('nextStimulus').image || `Stimulus` }/>
            </div>`
        )
    
    }
}

function getPrompt(task, trialType) {
    const stim = store.session.get("nextStimulus")
    if (task === 'egmaMath') {
        return (
            `<div id='stimulus-container'>
                ${stim.task === 'Number Identification' ? `<img src=${mediaAssets.images.speakerIcon} id='replay-btn' alt='speaker replay icon'/>` : ''}
                <p id="prompt">${ stim.prompt }</p>
                <br>
                <p id="stimulus-html" style="${stim.task === 'Number Identification' ? "color: transparent;" : ''}">${ stim.item }</p>
            </div>`
        )
    }

    if (task === 'trog') {
        return (`
        <div id='stimulus-container'>
            <img src=${mediaAssets.images.speakerIcon} id='replay-btn' alt='speaker replay icon'/>
          <p id="prompt">Choose the picture that shows...</p>
        </div>`
      )
    }

    if (trialType === 'audio') {
        return (`
        <div id='stimulus-container'>
          <p id="prompt">${stim.item}</p>
          <br>
          <img id="stimulus-img" src=${ mediaAssets.images[stim.image] ||  'https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc' }  alt=${ stim.image }/>
        </div>`
      )
    }
}

function getButtonChoices(task, trialType) {
    const stimulus = store.session.get("nextStimulus");
    if (stimulus.trialType === 'instructions') {
        return ['Continue']
    }
    const { answer, distractors } = stimulus;

    const trialInfo = prepareChoices(answer, distractors);

    store.session.set("target", answer);
    store.session.set("choices", trialInfo.choices);

    console.log({trialInfo})

    if (task === 'trog') {
        // for image buttons
        return trialInfo.choices.map((choice, i) => `<img src=${mediaAssets.images[camelize(choice)]} alt=${choice} />`)
    }

    if (task === 'matrix-reasoning' || task === 'theory-of-mind') {
        // for testing
        return Array(2).fill(0).map((_, i) => `<img src='https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc' alt='something' />`)
        // return trialInfo.choices.map((choice, i) => `<img src=${mediaAssets.images[choice] || `https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc`} alt=${choice} />`)
    }

    return trialInfo.choices;
}

function getButtonHtml(task, trialType) {
    const stimulus = store.session.get("nextStimulus");
    // if (stimulus.trialType === 'instructions') return

    if (task === 'egma-math') {
        return "<button class='math-btn'>%choice%</button>"
    } else {
        return "<button>%choice%</button>"
    }
}

function doOnLoad(task, trialType) { 
    const stim = store.session.get("nextStimulus") 
    console.log({stim})
    const { buttonLayout, keyHelpers} = store.session.get("config")
    let buttonContainer
    if (trialType === 'audio') {
        buttonContainer = document.getElementById("jspsych-audio-multi-response-btngroup")
    } else {
        buttonContainer = document.getElementById("jspsych-html-multi-response-btngroup")
    }

    if (buttonLayout !== 'default' && buttonContainer.children.length === 2) {
        buttonContainer.classList.add('default-layout');
    } else {
        buttonContainer.classList.add(`${buttonLayout}-layout`);
    }

    const arrowKeyEmojis = [
        ['arrowup', '↑'], 
        ['arrowleft', '←'], 
        ['arrowright', '→'], 
        ['arrowdown', '↓']
    ]
    
    const responseChoices = store.session('choices')

    Array.from(buttonContainer.children).forEach((el, i) => {
        if (buttonContainer.children.length === 2) {
            el.classList.add(`two-afc`)
        }
        // Add condition on triple for length (2)
        if (buttonLayout === 'triple' || buttonLayout === 'diamond') {
            el.classList.add(`button${i + 1}`)
        }

        // Map arrow to response choice.
        // 2afc layout uses left and right arrow keys. The order of the arrrow
        // key array allows for the correct mapping for other layouts.
        if (buttonContainer.children.length === 2) {
            keyboardResponseMap[arrowKeyEmojis[i+1][0]] = responseChoices[i] 
        } else {
            keyboardResponseMap[arrowKeyEmojis[i][0]] = responseChoices[i] 
        }

        if (task === 'trog' || task === 'matrix-reasoning' || task === 'theory-of-mind') {
            el.children[0].classList.add('img-btn')
        }

        if (keyHelpers) { 
        // Margin on the actual button element
        el.children[0].style.marginBottom = '.5rem'

        const arrowKeyBorder = document.createElement('div')
        arrowKeyBorder.classList.add('arrow-key-border')

        const arrowKey = document.createElement('p')
        if (buttonContainer.children.length === 2) {
            arrowKey.textContent = arrowKeyEmojis[i+1][1]
        } else {
            arrowKey.textContent = arrowKeyEmojis[i][1]
        }
        arrowKey.style.textAlign = 'center'
        arrowKey.style.fontSize = '1.5rem'
        arrowKey.style.margin = '0'
        // arrowKey.classList.add('arrow-key')
        arrowKeyBorder.appendChild(arrowKey)
        el.appendChild(arrowKeyBorder)
        }
    })

    // update the trial number
    store.session.transact("trialNumSubtask", (oldVal) => oldVal + 1);
    // update total real trials
    if (!isPractice(stim.notes)) {
        store.session.transact("trialNumTotal", (oldVal) => oldVal + 1);
    }

    if (store.session.get("nextStimulus").task === 'Number Identification' || task === 'trog') {
        const replayBtn = document.getElementById('replay-btn');

        async function replayAudio() {
        const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();

        // Returns a promise of the AudioBuffer of the preloaded file path.
        const audioBuffer = await jsPsych.pluginAPI.getAudioBuffer(mediaAssets.audio[stim.item] || mediaAssets.audio.nullAudio);

        audioSource = jsPsychAudioCtx.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(jsPsychAudioCtx.destination);
        audioSource.start(0);
        }

        replayBtn.addEventListener('click', replayAudio);
    }
}

function doOnFinish(data, task, trialType) {
    if (audioSource) audioSource.stop();

    // note: nextStimulus is actually the current stimulus
    const stimulus = store.session("nextStimulus");
    const choices = store.session("choices");
    const target = store.session('target')
    
    
    if (data.keyboard_response) {
        data.correct = keyboardResponseMap[data.keyboard_response] === target
        store.session.set("responseValue", keyboardResponseMap[data.keyboard_response]);
    } else {
        data.correct = data.button_response === store.session('correctResponseIdx')
        store.session.set("responseValue", choices[data.button_response]);
    }

    // check response and record it
    store.session.set("correct", data.correct);
    store.session.set("responseType", data.button_response ? 'mouse' : 'keyboard');

    // update running score and answer lists
    if (data.correct) {
        if (!isPractice(stimulus.notes)) {
        // practice trials don't count toward total
        store.session.transact("totalCorrect", (oldVal) => oldVal + 1);
        }
    } else {
        addItemToSortedStoreList("incorrectItems", target);
    }

    jsPsych.data.addDataToLastTrial({
        // specific to this trial
        item: _toNumber(stimulus.item) || stimulus.item,
        answer: target,
        distractors: stimulus.distractors,
        response: store.session("responseValue"),
        responseType: store.session('responseType'),
    });

    console.log('data: ', jsPsych.data.get().last(1).values()[0])

    if (!isPractice(stimulus.notes)) {
        updateProgressBar();
    }
}


// {trialType, responseAllowed, promptAboveButtons, task }
export const afcStimulus = ({trialType, responseAllowed, promptAboveButtons, task } = {}) => {
    return {
        type: trialType === 'audio' ? jsPsychAudioMultiResponse : jsPsychHTMLMultiResponse,
        response_allowed_while_playing: responseAllowed,
        data: () => {
            return {
                // not camelCase because firekit
                save_trial: true,
                assessment_stage: store.session.get("nextStimulus").task,
                // not for firekit
                isPracticeTrial: store.session.get("nextStimulus").notes === 'practice'
            }
        },
        stimulus: () => getStimulus(trialType),
        prompt: () => getPrompt(task, trialType),
        prompt_above_buttons: promptAboveButtons,
        keyboard_choices: ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'],
        button_choices: () => getButtonChoices(task, trialType),
        button_html: () => getButtonHtml(task, trialType),
        on_load: () => doOnLoad(task, trialType),
        on_finish: (data) => doOnFinish(data, task, trialType)
    }
}