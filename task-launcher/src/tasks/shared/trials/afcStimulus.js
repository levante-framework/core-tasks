// For Matrix reasoning, TROG, Theory of mind, Mental rotation, and EGMA Math
// Currently works in: TROG, Theory of mind, EGMA Math,

import jsPsychAudioMultiResponse from "@jspsych-contrib/plugin-audio-multi-response";
import jsPsychHTMLMultiResponse from "@jspsych-contrib/plugin-html-multi-response"
import store from "store2";
import { jsPsych } from "../../taskSetup";
import { prepareChoices, updateProgressBar, addItemToSortedStoreList, isPractice } from "../../shared/helpers";
import { mediaAssets } from "../../..";
import _toNumber from 'lodash/toNumber'
import { camelize } from "@bdelab/roar-utils";
import { getDevice } from "@bdelab/roar-utils";
import { t } from "i18next";

const isMobile = getDevice() === 'mobile'

// Previously chosen responses for current practice trial
let practiceResponses = []
let currPracticeChoiceMix = []
let currPracticeAnswerIdx

let audioSource;
let keyboardResponseMap = {}

function getStimulus(trialType) {
    const stim = store.session.get("nextStimulus")

    if (trialType === 'audio') {
        return mediaAssets.audio[camelize(stim.audioFile)] || mediaAssets.audio.nullAudio
    } else {
        return (`
            <div id='stimulus-container'>
                <p id="prompt">${stim.task === 'Matrix Reasoning' &&
                                 stim.notes === 'practice' ?
                                 stim.prompt : ''}
                </p>
                <br>
                <img id="stimulus-img" src=${ mediaAssets.images[store.session.get('nextStimulus').item] || mediaAssets.images['blank'] }  alt=${ store.session.get('nextStimulus').image || `Stimulus` }/>
            </div>`
        )
    }
}

function getPrompt(task, trialType) { // showItem itemIsImage
    const stim = store.session.get("nextStimulus")

    //if(stim.taskType === 'instructions' || stim.task === 'Number Identification' || stim.task === 'Number Comparison') showItem = false
    if(stim.trialType === 'instructions' || stim.task === 'instructions') {
        return (`
        <div id='stimulus-container' style='width: 80%;'>
            <img src=${mediaAssets.images.speakerIcon} id='replay-btn' alt='speaker replay icon'/>
            <p id="prompt">${ stim.prompt }</p>
        </div>`)
    }

    if (task === 'trog' || stim.task === 'Number Identification') {
      return (`
        <div id='stimulus-container'>
            <img src=${mediaAssets.images.speakerIcon} id='replay-btn' alt='speaker replay icon'/>
        </div>`
      )
    } 

    if (stim.audioFile != '') {
        return (
            `<div id='stimulus-container'>
                <img src=${mediaAssets.images.speakerIcon} id='replay-btn' alt='speaker replay icon'/>
                <p id="prompt">${ stim.prompt || stim.item }</p>
                <br>
                ${task === 'egma-math' ? 
                    `<p id="stimulus-html" style="${stim.task === 'Number Identification' || stim.task === 'Number Comparison' ? "color: transparent;" : ''}">${ stim.item }</p>`
                    :
                    `<img id="stimulus-img" src=${ mediaAssets.images[stim.item] || mediaAssets.images['blank'] }  alt=${ stim.image }/>`
                }
                
            </div>`
        )
    }

}

function getButtonChoices(task, trialType) {
    const stimulus = store.session.get("nextStimulus");
    if (stimulus.trialType === 'instructions' || stimulus.task === 'instructions') {
        return ['OK']
    } 
    const { answer, distractors } = stimulus;

    console.log({answer, distractors})

    const trialInfo = prepareChoices(answer, distractors);

    store.session.set("target", answer);
    store.session.set("choices", trialInfo.choices);

    if (task === 'matrix-reasoning') {
        if (!currPracticeChoiceMix.length && stimulus.notes === 'practice') {
            currPracticeChoiceMix = trialInfo.choices
            currPracticeAnswerIdx = store.session('correctResponseIdx')
        }
    }

    // for image buttons (trog, matrix reasoning, mental rotation...)
    if (task === 'trog' && stimulus.trialType != 'instructions') {
        // if (stimulus.notes === 'practice') {
        //     return currPracticeChoiceMix.map((choice, i) => `<img src=${mediaAssets.images[camelize(choice)]} alt=${choice} />`)
        // } else {
            return trialInfo.choices.map((choice, i) => `<img src=${mediaAssets.images[camelize(choice)]} alt=${choice} />`)
        // }
    }

    if (task === 'matrix-reasoning') {
        // for testing
        if (!trialInfo.choices.length) {
            return Array(2).fill(0).map((_, i) => `<img src='https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc' alt='something' />`)
        } else {
            if (stimulus.notes === 'practice') {
                return currPracticeChoiceMix.map((choice, i) => `<img src=${mediaAssets.images[choice] || `https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc`} alt=${choice} />`)
            } else {
                return trialInfo.choices.map((choice, i) => `<img src=${mediaAssets.images[choice] || `https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc`} alt=${choice} />`)
            }
        }
    }

    if (task === 'theory-of-mind') {
        console.log({trialInfo})
        // for testing
        if (!trialInfo.choices.length) {
            return Array(2).fill(0).map((_, i) => `<img src='https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc' alt='something' />`)
        } else {
            return trialInfo.choices.map((choice, i) => `<img src=${mediaAssets.images[choice] || `https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc`} alt=${choice} />`)
        }
    }

    return trialInfo.choices;
}

function getButtonHtml(task, trialType) {
    const stimulus = store.session.get("nextStimulus");
    // TODO: add trial_type column to math item bank
    if (stimulus.trialType === 'instructions' || stimulus.task === 'instructions') {
        return "<button id='continue-btn'>%choice%</button>"
    }

    if (task === 'egma-math') {
        return "<button class='math-btn'>%choice%</button>"
    } else {
        return "<button>%choice%</button>"
    }
}

function doOnLoad(task, trialType) { 
    const stim = store.session.get("nextStimulus") 
    // console.log({stim})
    if (stim.trialType !== 'instructions') {
        const { buttonLayout, keyHelpers } = store.session.get("config")
        
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
                if (stim.notes === 'practice' && task === 'matrix-reasoning') {
                    keyboardResponseMap[arrowKeyEmojis[i+1][0]] = currPracticeChoiceMix[i]
                } else {
                    keyboardResponseMap[arrowKeyEmojis[i+1][0]] = responseChoices[i]
                } 
            } else {
                if (stim.notes === 'practice' && task === 'matrix-reasoning') {
                    keyboardResponseMap[arrowKeyEmojis[i][0]] = currPracticeChoiceMix[i]
                } else {
                    keyboardResponseMap[arrowKeyEmojis[i][0]] = responseChoices[i] 
                }
            }


            if (task === 'matrix-reasoning' || task === 'theory-of-mind') {
                el.children[0].classList.add('img-btn')
            }

            if (task === 'trog') {
                el.children[0].classList.add('trog-img-btn')
            }

            if (task === 'matrix-reasoning') {
                if (stim.notes === 'practice' && practiceResponses.length) {
                    // feedback response (red X for wrong, green check for correct)
                    // green check TBI
                    practiceResponses.forEach((response) => {
                        if (response === el.children[0].children[0].alt) {
                            el.classList.add('response-feedback-container')
                            el.children[0].classList.add('response-feedback')
                            el.children[0].disabled = true
                        }
                    })
                }
            }

            if (keyHelpers && !isMobile) { 
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

        const replayBtn = document.getElementById('replay-btn');
        if(replayBtn) {
            let isAudioPlaying = false; // TODO: this only stops the Replay button from being used if it was already used 
            async function replayAudio() {
                const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();

                if (isAudioPlaying) {
                    return; // Exit the function if audio is already playing
                }
                isAudioPlaying = true;

                // Returns a promise of the AudioBuffer of the preloaded file path.
                const audioBuffer = await jsPsych.pluginAPI.getAudioBuffer(mediaAssets.audio[camelize(stim.audioFile)] || mediaAssets.audio.nullAudio);

                audioSource = jsPsychAudioCtx.createBufferSource();
                audioSource.buffer = audioBuffer;
                audioSource.connect(jsPsychAudioCtx.destination);
                audioSource.start(0);

                audioSource.onended = () => {
                    isAudioPlaying = false;
                };
            }

            replayBtn.addEventListener('click', replayAudio);
        }
    }
}

function doOnFinish(data, task) {
    if (audioSource) audioSource.stop();

    // note: nextStimulus is actually the current stimulus
    const stimulus = store.session("nextStimulus");
    // target is the actual value as a string
    const target = store.session('target')
    
    if (stimulus.trialType !== 'instructions') {
        if (data.keyboard_response) {
            data.correct = keyboardResponseMap[data.keyboard_response] === target
            store.session.set("responseValue", keyboardResponseMap[data.keyboard_response]);
        } else {
            if (stimulus.notes === 'practice' && task === 'matrix-reasoning') {
                data.correct = data.button_response === currPracticeAnswerIdx
                store.session.set("responseValue", currPracticeChoiceMix[data.button_response]);
            } else {
                data.correct = data.button_response === store.session('correctResponseIdx')
                store.session.set("responseValue", store.session('choices')[data.button_response]);
            }
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
            practiceResponses = []
            currPracticeChoiceMix = []
            currPracticeAnswerIdx = null
        } else {
            addItemToSortedStoreList("incorrectItems", target);

            const pushedResponse = store.session.get("responseValue")
            practiceResponses.push(pushedResponse)
        }

        jsPsych.data.addDataToLastTrial({
            // specific to this trial
            item: _toNumber(stimulus.item) || stimulus.item,
            answer: target,
            distractors: stimulus.distractors,
            response: store.session("responseValue"),
            responseType: store.session('responseType'),
        });

        // console.log('data: ', jsPsych.data.get().last(1).values()[0])

        if (!isPractice(stimulus.notes)) {
            updateProgressBar();
        }
    } else {
        jsPsych.data.addDataToLastTrial({
        // false because it's not a real trial
            correct: false
        })
    }
}


// { trialType, responseAllowed, promptAboveButtons, task }
export const afcStimulus = ({ trialType, responseAllowed, promptAboveButtons, task } = {}) => {
    // TODO: pull out task-specific parameters (e.g., getPrompt(.., showPrompt=false) for Number Identification, TROG, ..)
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

export const afcCondtional = ({trialType, responseAllowed, promptAboveButtons, task } = {}) => {
    return {
        timeline: [
            afcStimulus({
            trialType: trialType,
            responseAllowed: responseAllowed,
            promptAboveButtons: promptAboveButtons,
            task: task
            })
        ],


        loop_function: () => {
            const stim = store.session.get("nextStimulus");

            if (stim.notes === 'practice') {
                // getting data from two trials ago due to setup trial being in the timeline
                const currentTrialIndex = jsPsych.getProgress().current_trial_global;
                const twoTrialsAgoIndex = currentTrialIndex - 2;

                // get data from 2 trials ago
                const twoTrialsAgoStimulus = jsPsych.data.get().filter({trial_index: twoTrialsAgoIndex}).values();
                const previousStimulus = jsPsych.data.get().filter({trial_index: twoTrialsAgoIndex + 1}).values();;
                const isTwoTrialsAgoStimCorrect = twoTrialsAgoStimulus[0].correct;
                const isPreviousStimulusCorrect = previousStimulus[0].correct;
                // console.log('twoTrialsAgoStimulus: ', twoTrialsAgoStimulus)
                // console.log('isTwoTrialsAgoStimCorrect: ', isTwoTrialsAgoStimCorrect)
                // console.log('previousStimulus: ', previousStimulus)
                // console.log('isPrevStimCorrect: ', isPreviousStimulusCorrect)

                if (isTwoTrialsAgoStimCorrect || isPreviousStimulusCorrect) {
                    return false
                } else {
                    return true
                }
            } else {
                return false
            }
        }
    }
}