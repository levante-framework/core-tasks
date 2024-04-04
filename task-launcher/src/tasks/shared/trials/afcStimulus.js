// For Matrix reasoning, TROG, Theory of mind, Mental rotation, and EGMA Math
// Currently works in: TROG, Theory of mind, Mental Rotation, Matrix Reasoning, and EGMA Math
import jsPsychAudioMultiResponse from "@jspsych-contrib/plugin-audio-multi-response";
import jsPsychHTMLMultiResponse from "@jspsych-contrib/plugin-html-multi-response"
import store from "store2";
import { jsPsych } from "../../taskSetup";
import { prepareChoices, addItemToSortedStoreList, isPractice, fractionToMathML, isMaxTimeoutReached } from "../../shared/helpers";
import { mediaAssets } from "../../..";
import _toNumber from 'lodash/toNumber'
import { camelize } from "@bdelab/roar-utils";
import { getDevice } from "@bdelab/roar-utils";


const isMobile = getDevice() === 'mobile'
const numIncorrectResponsesToEnd = 3

// Previously chosen responses for current practice trial
let practiceResponses = []
let currPracticeChoiceMix = []
let currPracticeAnswerIdx
let trialsOfCurrentType = 0

let audioSource;
let keyboardResponseMap = {}
// Only used for keyboard responses
let startTime
const incorrectPracticeResponses = []


function getStimulus(trialType) {
    // ToDo: trialType (audio/html) no longer varies -- remove
    const stim = store.session.get("nextStimulus")
    if(!stim.audioFile) return mediaAssets.audio.nullAudio;
    // all tasks should have the replay button play whatever is in stim.audioFile (might be just prompt/instructions)
    
    if (stim.task === 'Mental Rotation' && 
        stim.notes !== 'practice' &&
        stim.trialType !== 'instructions'
    ) {
        return mediaAssets.audio.nullAudio;
    }
    
    if (stim.audioFile != '' || 
        stim.trialType === "Number Identification" || 
        stim.task === "TROG" || 
        trialsOfCurrentType < 3 
    ) {
        return mediaAssets.audio[camelize(stim.audioFile)];
    } else {
        return mediaAssets.audio.nullAudio;
    }
}



function getPrompt(task, trialType) { // showItem itemIsImage
    const stim = store.session.get("nextStimulus");

    let stimItem;
    if (stim.trialType === 'Fraction') {
        stimItem = fractionToMathML(stim.item);
    } else {
        stimItem = stim.item;
    }

    const replayButtonDiv = `<div id='replay-btn'>
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="38" viewBox="0 0 44 38" fill="none">
            <path d="M34.561 11.7551C34.2268 11.3413 33.7419 11.0773 33.2131 11.021C32.6842 10.9648 32.1547 11.1209 31.741 11.4551C31.3272 11.7892 31.0632 12.2741 31.0069 12.8029C30.9507 13.3318 31.1068 13.8613 31.441 14.2751C32.4514 15.6489 32.9964 17.3097 32.9964 19.0151C32.9964 20.7205 32.4514 22.3812 31.441 23.7551C31.2025 24.049 31.0524 24.4045 31.008 24.7804C30.9635 25.1562 31.0267 25.537 31.1901 25.8784C31.3534 26.2198 31.6103 26.5078 31.9309 26.709C32.2514 26.9102 32.6225 27.0164 33.001 27.0151C33.2997 27.0161 33.595 26.9501 33.8649 26.8221C34.1349 26.694 34.3727 26.5071 34.561 26.2751C36.1474 24.1872 37.0063 21.6372 37.0063 19.0151C37.0063 16.3929 36.1474 13.8429 34.561 11.7551Z" fill="#275BDD"/>
            <path d="M37.28 5.47428C37.0778 5.30619 36.8444 5.17957 36.5932 5.10167C36.3421 5.02376 36.078 4.99609 35.8162 5.02024C35.5543 5.04438 35.2997 5.11986 35.0671 5.24238C34.8344 5.36489 34.6281 5.53204 34.46 5.73428C34.2919 5.93651 34.1653 6.16988 34.0874 6.42104C34.0095 6.67221 33.9818 6.93626 34.006 7.19812C34.0301 7.45999 34.1056 7.71453 34.2281 7.94722C34.3506 8.17991 34.5178 8.38619 34.72 8.55428C36.3241 9.79402 37.6307 11.3767 38.5442 13.1865C39.4578 14.9963 39.9552 16.9875 40 19.0143C39.9552 21.0411 39.4578 23.0322 38.5442 24.8421C37.6307 26.6519 36.3241 28.2345 34.72 29.4743C34.5175 29.6422 34.3501 29.8484 34.2274 30.0811C34.1047 30.3138 34.0291 30.5684 34.0049 30.8303C33.9808 31.0923 34.0085 31.3564 34.0866 31.6076C34.1647 31.8588 34.2916 32.0922 34.46 32.2943C34.648 32.52 34.8835 32.7016 35.1497 32.826C35.4159 32.9505 35.7062 33.0148 36 33.0143C36.4673 33.0152 36.9202 32.8524 37.28 32.5543C39.3409 30.9431 41.0144 28.8905 42.1773 26.5473C43.3403 24.2041 43.9631 21.6299 44 19.0143C43.9631 16.3986 43.3403 13.8245 42.1773 11.4813C41.0144 9.1381 39.3409 7.08542 37.28 5.47428ZM26.94 1.25428C26.636 1.07874 26.2911 0.986328 25.94 0.986328C25.5889 0.986328 25.244 1.07874 24.94 1.25428L12 10.1543H2C1.46957 10.1543 0.960859 10.365 0.585786 10.7401C0.210714 11.1151 0 11.6238 0 12.1543V25.8743C0 26.4047 0.210714 26.9134 0.585786 27.2885C0.960859 27.6636 1.46957 27.8743 2 27.8743H12L24.82 36.6743C25.1712 36.9015 25.5817 37.0198 26 37.0143C26.5304 37.0143 27.0391 36.8036 27.4142 36.4285C27.7893 36.0534 28 35.5447 28 35.0143V3.01428C27.999 2.65247 27.8999 2.2977 27.7133 1.98776C27.5266 1.67782 27.2594 1.42433 26.94 1.25428Z" fill="#275BDD"/>
        </svg>
        </div>`
    //if(stim.taskType === 'instructions' || stim.trialType === 'Number Identification' || stim.trialType === 'Number Comparison') showItem = false
    let showImageStim = false;
    if(stim.task === 'Mental Rotation' || stim.task === 'Matrix Reasoning') showImageStim = true;

    if(stim.trialType === 'instructions' || stim.task === 'instructions' || showImageStim) {
        return (`
        <div id='stimulus-container'>` + replayButtonDiv +
            `<div id="prompt-container-text">
                <p id="prompt">${ stim.prompt }</p>
            </div>

            ${ stim.task === 'math' || stimItem === '' ? '' :
                `<img 
                id="stimulus-img" 
                src=${ mediaAssets.images[stimItem] || mediaAssets.images['blank'] }
                alt=${ stimItem || `Stimulus` }
                />`
            }
        </div>`)
    }
    
    // just audio - no text prompt/stimulus
    if (task === 'trog' || stim.trialType === 'Number Identification' || stim.trialType === 'Number Comparison') {
      return (`
        <div id='stimulus-container'>`
        + replayButtonDiv +
        `</div>`
      )
    } 

    if (task === 'theory-of-mind') {
        return (`
        <div id='stimulus-container'>`
        + replayButtonDiv +
            `<img 
              id="stimulus-img" 
              src=${ mediaAssets.images[stimItem] || mediaAssets.images['blank'] }
              alt=${ stimItem || `Stimulus` }
            />
        </div>`
      )
    }

    if (stim.audioFile != '') {
        return (
            `<div id='stimulus-container'>` +
            replayButtonDiv + // || stim.item
                `<div id="prompt-container-text">
                    <p id="prompt">${ stim.prompt }</p>
                </div>
                <br>
                ${task === 'egma-math' ? 
                    `<p id="stimulus-html">${ stimItem }</p>`
                    :
                    ``
                }
                
            </div>`
        )
    }

}

function generateImageChoices(choices) {
    const practiceUrl = 'https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc';
    return choices.map(choice => {
        const imageUrl = mediaAssets.images[camelize(choice)] || practiceUrl;
        return `<img src=${imageUrl} alt=${choice} />`;
    });
}

function getButtonChoices(task, trialType) {
    const stimulus = store.session.get("nextStimulus");
    if (stimulus.trialType === 'instructions') {
        return ['OK'];
    }

    const { answer, distractors } = stimulus;
    let trialInfo = stimulus.task === "Mental Rotation" ? prepareChoices(answer, distractors, false) : prepareChoices(answer, distractors);
    store.session.set("target", answer);
    store.session.set("choices", trialInfo.choices);

    if (task === 'matrix-reasoning' && stimulus.notes === 'practice' && !currPracticeChoiceMix.length) {
        currPracticeChoiceMix = trialInfo.choices;
        currPracticeAnswerIdx = store.session.get('correctResponseIdx'); // Fixed: Use 'get' for consistency
    }

    if (stimulus.trialType === 'Fraction') {
        const mathMLChoices = [fractionToMathML(answer), ...distractors.map(fractionToMathML)];
        store.session.set("choices", mathMLChoices);
        return mathMLChoices;
    }

    if (['trog', 'matrix-reasoning', 'mental-rotation'].includes(task) && stimulus.trialType !== 'instructions') {
        return generateImageChoices(trialInfo.choices);
    }

    return trialInfo.choices; // Default return if no special conditions met
}

function getButtonHtml(task, trialType) {
    const stimulus = store.session.get("nextStimulus");
    // TODO: add trial_type column to math item bank
    if (stimulus.trialType === 'instructions') {
        return "<button id='continue-btn'>%choice%</button>"  
    }
    if (stimulus.trialType === 'Fraction') { 
        return "<button class='math-btn'>%choice%</button>"; 
    } else if (task === 'egma-math') {
        // practice-btn class does not add any styles, only used for querySelector
        return `<button class='math-btn ${stimulus.notes === 'practice' ? 'practice-btn' : ''}'>%choice%</button>`
    } else {
        return `<button class='${stimulus.notes === 'practice' ? 'practice-btn' : ''}'>%choice%</button>`
    }
}

function enableBtns(btnElements) {
    btnElements.forEach(btn => btn.disabled = false);
}

async function keyboardBtnFeedback(e, practiceBtns, stim) {
    let allowedKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
    
    if (stim.distractors.length === 1) {
        allowedKeys = ['ArrowLeft', 'ArrowRight']
    }

    if (allowedKeys.includes(e.key)) 
    {
        let feedbackAudio
        const choice = keyboardResponseMap[e.key.toLowerCase()];
        // Find button with response text
        practiceBtns.forEach(btn => {
            if (btn.children.length) {
                const btnOption = btn.children[0].alt
                if (choice == btnOption) {
                    if (choice == stim.answer) {
                        btn.classList.add('practice-correct');
                        feedbackAudio = mediaAssets.audio.feedbackGoodJob;
                        setTimeout(() => jsPsych.finishTrial({response: choice, incorrectPracticeResponses: incorrectPracticeResponses}), 1000);
                    } else {
                        btn.classList.add('practice-incorrect');
                        feedbackAudio = mediaAssets.audio.feedbackTryAgain;
                        setTimeout(() => enableBtns(practiceBtns), 500);
                        incorrectPracticeResponses.push(choice)
                    }
                }
            } else {
                const btnOption = btn.textContent;
                
                if (choice == btnOption) {
                    if (choice == stim.answer) {
                        btn.classList.add('practice-correct');
                        feedbackAudio = mediaAssets.audio.feedbackGoodJob;
                        setTimeout(() => jsPsych.finishTrial({response: choice, incorrectPracticeResponses: incorrectPracticeResponses}), 1000);
                    } else {
                        btn.classList.add('practice-incorrect');
                        feedbackAudio = mediaAssets.audio.feedbackTryAgain;
                        setTimeout(() => enableBtns(practiceBtns), 500);
                        incorrectPracticeResponses.push(choice)
                    }
                }
            }
        });

        const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();

        // Returns a promise of the AudioBuffer of the preloaded file path.
        const audioBuffer = await jsPsych
            .pluginAPI
            .getAudioBuffer(feedbackAudio);

        audioSource = jsPsychAudioCtx.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(jsPsychAudioCtx.destination);
        audioSource.start(0);
    }
}

let keyboardFeedbackHandler

function doOnLoad(task, trialType) {
    startTime = performance.now();

    const stim = store.session.get("nextStimulus") 
    const currentTrialIndex = jsPsych.getProgress().current_trial_global;
    let twoTrialsAgoIndex = currentTrialIndex - 2;
    if( stim.task === "math" ) {
        twoTrialsAgoIndex = currentTrialIndex - 3; // math has a fixation or something
    }
    const twoTrialsAgoStimulus = jsPsych.data.get().filter({trial_index: twoTrialsAgoIndex}).values();
    // console.log("twoTrialsAgostim: ",twoTrialsAgoStimulus);
    // console.log({stim})

    if (stim.notes === "practice") {
        const practiceBtns = document.querySelectorAll('.practice-btn');
        let feedbackAudio

        practiceBtns
            .forEach(btn => btn.addEventListener('click',
                async (e) => {
                    // assume img btn
                    if (btn.children.length) {
                        const choice = btn.children[0].alt;
                        // Loose equality to handle number strings
                        if (choice == stim.answer) {
                            btn.classList.add('practice-correct');
                            feedbackAudio = mediaAssets.audio.feedbackGoodJob;
                            setTimeout(() => jsPsych.finishTrial({response: choice, incorrectPracticeResponses: incorrectPracticeResponses}), 1000);
                        } else {
                            btn.classList.add('practice-incorrect');
                            feedbackAudio = mediaAssets.audio.feedbackTryAgain;
                            setTimeout(() => enableBtns(practiceBtns), 500);
                            incorrectPracticeResponses.push(choice)
                        }
                    } else {
                        const choice = btn.textContent;

                        if (choice == stim.answer) {
                            btn.classList.add('practice-correct');
                            feedbackAudio = mediaAssets.audio.feedbackGoodJob;
                            setTimeout(() => jsPsych.finishTrial({response: choice, incorrectPracticeResponses: incorrectPracticeResponses}), 1000);
                        } else {
                            btn.classList.add('practice-incorrect');
                            feedbackAudio = mediaAssets.audio.feedbackTryAgain;
                            setTimeout(() => enableBtns(practiceBtns), 500);
                            incorrectPracticeResponses.push(choice)    
                        }
                    }
        
                    const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();

                    // Returns a promise of the AudioBuffer of the preloaded file path.
                    const audioBuffer = await jsPsych
                        .pluginAPI
                        .getAudioBuffer(feedbackAudio);
        
                    audioSource = jsPsychAudioCtx.createBufferSource();
                    audioSource.buffer = audioBuffer;
                    audioSource.connect(jsPsychAudioCtx.destination);
                    audioSource.start(0);
                }
            ));
        
        if (!isMobile) {
            function keyboardBtnFeedbackHandler(e) {
                keyboardBtnFeedback(e, practiceBtns, stim);
            }

            keyboardFeedbackHandler = keyboardBtnFeedbackHandler

            document.addEventListener('keydown', keyboardFeedbackHandler);
        }
    }

    // should log trialsOfCurrentType - race condition
    if ( stim.task === "math" ) {
        if ( twoTrialsAgoStimulus != undefined && stim.trialType === twoTrialsAgoStimulus[0]?.trialType ) {
            trialsOfCurrentType += 1;
        } else {
            trialsOfCurrentType = 0;
        }
    } else {
        if ( stim.notes != "practice" && stim.trialType != "instructions" ) {
            trialsOfCurrentType += 1;
        }
    }
    
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

        // const arrowKeyEmojis = [
        //     ['arrowup', '↑'], 
        //     ['arrowleft', '←'], 
        //     ['arrowright', '→'], 
        //     ['arrowdown', '↓']
        // ]

        const arrowKeyEmojis = [
            ['arrowup', `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M41.7238 27.1414L43.8051 25.0602C44.6863 24.1789 44.6863 22.7539 43.8051 21.882L25.5895 3.65703C24.7082 2.77578 23.2832 2.77578 22.4113 3.65703L4.18633 21.882C3.30508 22.7633 3.30508 24.1883 4.18633 25.0602L6.26758 27.1414C7.1582 28.032 8.61133 28.0133 9.4832 27.1039L20.2457 15.807L20.2457 42.7508C20.2457 43.9977 21.2488 45.0008 22.4957 45.0008H25.4957C26.7426 45.0008 27.7457 43.9977 27.7457 42.7508L27.7457 15.807L38.5082 27.1039C39.3801 28.0227 40.8332 28.0414 41.7238 27.1414Z" fill="#A0BBFF"/>
            </svg>
            `], 
            ['arrowleft', `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M27.1414 41.7277L25.0602 43.809C24.1789 44.6902 22.7539 44.6902 21.882 43.809L3.65703 25.5934C2.77578 24.7121 2.77578 23.2871 3.65703 22.4152L21.882 4.19023C22.7633 3.30898 24.1883 3.30898 25.0602 4.19023L27.1414 6.27148C28.032 7.16211 28.0133 8.61523 27.1039 9.48711L15.807 20.2496H42.7508C43.9977 20.2496 45.0008 21.2527 45.0008 22.4996V25.4996C45.0008 26.7465 43.9977 27.7496 42.7508 27.7496H15.807L27.1039 38.5121C28.0227 39.384 28.0414 40.8371 27.1414 41.7277Z" fill="#A0BBFF"/>
            </svg>`], 
            ['arrowright', `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M20.8586 6.27227L22.9398 4.19102C23.8211 3.30977 25.2461 3.30977 26.118 4.19102L44.343 22.4066C45.2242 23.2879 45.2242 24.7129 44.343 25.5848L26.118 43.8098C25.2367 44.691 23.8117 44.691 22.9398 43.8098L20.8586 41.7285C19.968 40.8379 19.9867 39.3848 20.8961 38.5129L32.193 27.7504H5.24921C4.00234 27.7504 2.99921 26.7473 2.99921 25.5004V22.5004C2.99921 21.2535 4.00234 20.2504 5.24921 20.2504H32.193L20.8961 9.48789C19.9773 8.61602 19.9586 7.16289 20.8586 6.27227Z" fill="#A0BBFF"/>
            </svg>`], 
            ['arrowdown', `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M41.7238 20.8586L43.8051 22.9398C44.6863 23.8211 44.6863 25.2461 43.8051 26.118L25.5895 44.343C24.7082 45.2242 23.2832 45.2242 22.4113 44.343L4.18633 26.118C3.30508 25.2367 3.30508 23.8117 4.18633 22.9398L6.26758 20.8586C7.1582 19.968 8.61133 19.9867 9.4832 20.8961L20.2457 32.193L20.2457 5.24921C20.2457 4.00234 21.2488 2.99921 22.4957 2.99921H25.4957C26.7426 2.99921 27.7457 4.00234 27.7457 5.24921L27.7457 32.193L38.5082 20.8961C39.3801 19.9773 40.8332 19.9586 41.7238 20.8586Z" fill="#A0BBFF"/>
            </svg>`]
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
                el.children[0].classList.add('img-btn');
            }

            if (task === 'trog') {
                el.children[0].classList.add('trog-img-btn');
            } else if (task === 'mental-rotation') {
                el.children[0].classList.add('mental-rotation-img-btn');
                let img = document.getElementById('stimulus-img'); 
                img.style.width = '17vw';
                img.style.height = '17vw';
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
                    arrowKey.innerHTML = arrowKeyEmojis[i+1][1]
                } else {
                    arrowKey.innerHTML = arrowKeyEmojis[i][1]
                }
                arrowKey.style.textAlign = 'center'
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
    }

    const replayBtn = document.getElementById('replay-btn');
    let isAudioPlaying = false;

    if (replayBtn) { // TODO: this only stops the Replay button from being used if it was already used 
        async function replayAudio() {
            if (isAudioPlaying) {
                return; // Exit the function if audio is already playing
            }

            const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();
            
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

function doOnFinish(data, task) {
    if (audioSource) audioSource.stop();

    // note: nextStimulus is actually the current stimulus
    const stimulus = store.session("nextStimulus");
    // target is the actual value as a string
    const target = store.session('target')

    if (store.session.get("incorrectTrials") === null) {
        store.session.set("incorrectTrials", 0);
    }

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
                store.session.set("incorrectTrials", 0); // reset incorrect trial count
            }
            practiceResponses = []
            currPracticeChoiceMix = []
            currPracticeAnswerIdx = null
        } else {
            // Only increase incorrect trials if response is incorrect not a practice trial
            if (!isPractice(stimulus.notes)) {
                store.session.transact("incorrectTrials", (oldVal) => oldVal + 1);
            }
            addItemToSortedStoreList("incorrectItems", target);

            const pushedResponse = store.session.get("responseValue")
            practiceResponses.push(pushedResponse)
        }

        jsPsych.data.addDataToLastTrial({
            // specific to this trial
            item: _toNumber(stimulus.item) || stimulus.item,
            answer: target,
            distractors: stimulus.distractors,
            trialType: stimulus.trialType,
            responseType: store.session('responseType'),
        });

        // Adding this seperately or otherwise it will overide 
        // the response value added from practice trials
        if (stimulus.notes !== 'practice') {
            jsPsych.data.addDataToLastTrial({
                response: store.session("responseValue"),
            })
        }

        // adding manually since trial does not log it properly
        // for keyboard responses
        if (data.responseType === 'keyboard' || data.response_source === 'keyboard') {
            const endTime = performance.now();
            const calculatedRt = Math.round((endTime - startTime));
            jsPsych.data.addDataToLastTrial({
                rt: calculatedRt
            })
        }

    // remove listner or it will stack since were adding it on the document itself
        if (stimulus.notes === 'practice') {
            document.removeEventListener('keydown', keyboardFeedbackHandler)
        }

        // console.log('data: ', jsPsych.data.get().last(1).values()[0])

    } else {
        jsPsych.data.addDataToLastTrial({
        // false because it's not a real trial
            correct: false
        })
    }

    if(store.session.get("incorrectTrials") >= numIncorrectResponsesToEnd) {
        store.session.set("incorrectTrials",0);
        jsPsych.endExperiment(
            `<div id="prompt-container-text">
                <p id="prompt">You've completed the task. Thank you!</p>
            </div>`); // ToDo: style text and add audio message?
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
        keyboard_choices: () => {
            return store.session.get("nextStimulus").distractors?.length === 1 ? 
            ['ArrowLeft', 'ArrowRight'] :
            ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']
        },
        button_choices: () => getButtonChoices(task, trialType),
        button_html: () => getButtonHtml(task, trialType),
        on_load: () => doOnLoad(task, trialType),
        on_finish: (data) => doOnFinish(data, task, trialType),
        response_ends_trial: () => store.session.get("nextStimulus").notes === 'practice' ? false : true
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

export const afcStimulusWithTimeoutCondition = ({trialType, responseAllowed, promptAboveButtons, task } = {}) => {
    return {
        timeline: [
            afcStimulus({
            trialType: trialType,
            responseAllowed: responseAllowed,
            promptAboveButtons: promptAboveButtons,
            task: task
            })
        ],
        conditional_function: () => {
            // TO DO if isRoar game parameter is desired
            // const stim = store.session.get("nextStimulus")
            // if (stim.notes.startsWith("roar-") && !isRoar) {
            //     console.log("TO DO roar-only instructions start with roar- in notes field")
            // }

            // don't play when skipping trials because app is finished
            if (isMaxTimeoutReached()) {
                // timer cleanup
                if (store.session.get("maxTimerId")) { 
                    clearTimeout(store.session.get("maxTimerId"));
                    store.session.set("maxTimerId", null);
                }
                return false;
            }
            else {
                return true;
            }
            
        },
    }
}