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
    // TODO: move this elsewhere...maybe a dedicated getBackground() ?
    const right_clouds = `<svg xmlns="http://www.w3.org/2000/svg" width="304" height="133" viewBox="0 0 304 133" fill="none" style="position: fixed; right: 0; z-index: 0">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M199.457 0C184.109 0.00042833 169.183 5.03826 156.958 14.3441C144.733 23.6499 135.881 36.7123 131.753 51.5368C127.343 50.1265 122.743 49.4068 118.114 49.4031C109.545 49.4004 101.149 51.8155 93.8843 56.3724C86.6197 60.9292 80.7802 67.4438 77.0334 75.1716C72.6211 71.6417 67.3056 69.4313 61.6971 68.7943C56.0887 68.1573 50.4148 69.1197 45.3272 71.5707C40.2395 74.0217 35.9444 77.8621 32.9351 82.6507C29.9258 87.4393 28.3243 92.9819 28.3147 98.6421C28.3119 100.476 28.467 102.306 28.7784 104.113H14.4574C10.63 104.12 6.96098 105.646 4.25204 108.358C1.54309 111.069 0.0144092 114.746 0 118.584C0.0143713 122.425 1.54217 126.104 4.25035 128.82C6.95853 131.536 10.6275 133.068 14.4574 133.082H493.57C497.4 133.068 501.069 131.536 503.777 128.82C506.485 126.104 508.013 122.425 508.027 118.584C508.017 117.666 507.926 116.75 507.755 115.848C507.929 114.763 508.02 113.665 508.027 112.566C508.022 108.858 506.973 105.226 505.003 102.088C503.033 98.9497 500.22 96.4323 496.888 94.8243C493.556 93.2163 489.839 92.583 486.164 92.9971C482.489 93.4111 479.005 94.8556 476.112 97.165C472.962 90.693 467.601 85.5686 461.004 82.7226C454.407 79.8765 447.011 79.4976 440.159 81.6547C437.461 71.9806 431.696 63.4501 423.736 57.3527C415.775 51.2552 406.052 47.9221 396.035 47.8572C386.018 47.7923 376.252 50.9992 368.214 56.993C360.175 62.9869 354.301 71.4419 351.478 81.0803C349.207 80.5432 346.883 80.2678 344.55 80.2596C340.464 80.2463 336.418 81.0747 332.665 82.6934C328.911 84.312 325.528 86.6865 322.727 89.6697C321.351 78.5893 315.988 68.3941 307.645 60.9996C299.301 53.6051 288.553 49.5203 277.418 49.5126C273.864 49.5158 270.322 49.9289 266.862 50.7436C262.601 36.1186 253.731 23.2708 241.58 14.1234C229.429 4.97597 214.651 0.0209344 199.457 0Z" fill="white" fill-opacity="0.3"/>
  </svg>
  <svg xmlns="http://www.w3.org/2000/svg" width="236" height="90" viewBox="0 0 236 90" fill="none" style="position: fixed; right: 0; z-index: 0">
<path fill-rule="evenodd" clip-rule="evenodd" d="M0.931641 89.9996H409.558C409.239 87.1703 408.171 84.4783 406.464 82.203C404.757 79.9276 402.474 78.1521 399.852 77.0605C397.229 75.969 394.363 75.6014 391.552 75.9959C388.74 76.3904 386.085 77.5326 383.862 79.3038C381.873 75.1983 378.771 71.7377 374.911 69.3186C371.052 66.8995 366.591 65.6199 362.039 65.6263C359.56 65.6341 357.096 66.012 354.729 66.7478C352.538 58.9329 347.872 52.0443 341.436 47.1211C334.999 42.1979 327.141 39.5071 319.046 39.4546C310.951 39.4021 303.059 41.9908 296.559 46.8301C290.06 51.6694 285.306 58.4969 283.014 66.2828C281.181 65.8527 279.305 65.6325 277.422 65.6263C274.128 65.6243 270.867 66.2978 267.842 67.6056C264.816 68.9133 262.089 70.8277 259.828 73.231C259.178 68.0713 257.454 63.1062 254.766 58.6581C252.079 54.2101 248.489 50.3785 244.229 47.412C239.969 44.4455 235.135 42.4104 230.04 41.4389C224.945 40.4674 219.704 40.5812 214.656 41.7728C211.18 29.8895 203.941 19.4642 194.033 12.0735C184.124 4.68273 172.085 0.728466 159.737 0.808818C147.388 0.88917 135.401 4.9997 125.589 12.5188C115.777 20.0378 108.673 30.5565 105.352 42.484C101.761 41.3455 98.016 40.7733 94.25 40.788C87.3219 40.7808 80.5316 42.7294 74.656 46.4108C68.7804 50.0922 64.0567 55.3578 61.0253 61.6052C57.4642 58.7406 53.1676 56.9448 48.632 56.4253C44.0963 55.9057 39.5066 56.6835 35.3931 58.6688C31.2795 60.6541 27.81 63.766 25.3852 67.6449C22.9605 71.5238 21.6795 76.0115 21.6903 80.5895C21.6932 82.0476 21.8209 83.5028 22.0722 84.939H10.5335C8.6446 84.9427 6.78464 85.405 5.11256 86.2863C3.44049 87.1675 2.006 88.4415 0.931641 89.9996Z" fill="white" fill-opacity="0.8"/>
</svg>`
    const bottom_clouds = `<svg xmlns="http://www.w3.org/2000/svg" width="905" height="212" viewBox="0 0 905 212" fill="none" style="position: fixed; right: 0; z-index: 0">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M565.601 93.4941C557.817 93.4965 550.193 95.7056 543.614 99.8651C537.034 104.025 531.769 109.964 528.429 116.995C521.146 113.687 513.24 111.978 505.241 111.981H504.419C504.969 108.865 505.245 105.706 505.241 102.542C505.246 91.4721 501.971 80.649 495.829 71.4394C489.687 62.2297 480.954 55.0466 470.732 50.797C460.51 46.5475 449.258 45.422 438.397 47.563C427.536 49.7039 417.552 55.0151 409.708 62.8258C401.095 54.3037 389.957 48.795 377.957 47.1221C365.956 45.4491 353.736 47.7015 343.121 53.5431C337.732 37.8605 327.564 24.2611 314.046 14.657C300.527 5.05291 284.338 -0.0727081 267.756 0.000779291C251.173 0.0742666 235.03 5.34316 221.597 15.0667C208.165 24.7902 198.117 38.4792 192.868 54.209C184.351 49.1857 174.657 46.5048 164.769 46.4382C154.882 46.3717 145.152 48.9219 136.569 53.8301C127.985 58.7383 120.853 65.8298 115.895 74.3849C110.938 82.94 108.332 92.6543 108.341 102.542C108.349 105.785 108.638 109.022 109.203 112.216C107.362 112.216 105.286 111.942 103.602 111.942C88.7468 111.942 74.5 117.843 63.9958 128.347C53.4916 138.851 47.5904 153.097 47.5904 167.952C47.6013 174.637 48.7947 181.267 51.1156 187.536H18.1744C13.3642 187.546 8.75338 189.459 5.34837 192.856C1.94336 196.254 0.0206781 200.86 0 205.67C0.0206781 210.48 1.94336 215.087 5.34837 218.485C8.75338 221.882 13.3642 223.795 18.1744 223.805H886.865C891.675 223.795 896.286 221.882 899.691 218.485C903.096 215.087 905.018 210.48 905.039 205.67C905.018 200.86 903.096 196.254 899.691 192.856C896.286 189.459 891.675 187.546 886.865 187.536H857.331C857.534 185.925 857.639 184.303 857.645 182.679C857.645 171.751 853.303 161.27 845.576 153.543C837.848 145.816 827.367 141.475 816.439 141.475H815.851C816.246 139.185 816.443 136.865 816.439 134.542C816.413 126.398 813.972 118.445 809.425 111.688C804.878 104.932 798.429 99.6758 790.893 96.5855C783.358 93.4952 775.076 92.7094 767.094 94.3274C759.112 95.9454 751.789 99.8946 746.052 105.675C739.711 99.3818 731.499 95.3152 722.649 94.0864C713.799 92.8575 704.79 94.5326 696.973 98.8601C693.016 87.3229 685.542 77.3166 675.601 70.2488C665.661 63.1811 653.754 59.4078 641.557 59.4597C629.36 59.5116 617.486 63.386 607.606 70.538C597.725 77.6901 590.336 87.7597 586.478 99.3301C580.17 95.544 572.958 93.5279 565.601 93.4941Z" fill="white" fill-opacity="0.4"/>
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" width="905" height="212" viewBox="0 0 905 212" fill="none" style="position: fixed; right: 0; z-index: 0">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M565.601 93.4941C557.817 93.4965 550.193 95.7056 543.614 99.8651C537.034 104.025 531.769 109.964 528.429 116.995C521.146 113.687 513.24 111.978 505.241 111.981H504.419C504.969 108.865 505.245 105.706 505.241 102.542C505.246 91.4721 501.971 80.649 495.829 71.4394C489.687 62.2297 480.954 55.0466 470.732 50.797C460.51 46.5475 449.258 45.422 438.397 47.563C427.536 49.7039 417.552 55.0151 409.708 62.8258C401.095 54.3037 389.957 48.795 377.957 47.1221C365.956 45.4491 353.736 47.7015 343.121 53.5431C337.732 37.8605 327.564 24.2611 314.046 14.657C300.527 5.05291 284.338 -0.0727081 267.756 0.000779291C251.173 0.0742666 235.03 5.34316 221.597 15.0667C208.165 24.7902 198.117 38.4792 192.868 54.209C184.351 49.1857 174.657 46.5048 164.769 46.4382C154.882 46.3717 145.152 48.9219 136.569 53.8301C127.985 58.7383 120.853 65.8298 115.895 74.3849C110.938 82.94 108.332 92.6543 108.341 102.542C108.349 105.785 108.638 109.022 109.203 112.216C107.362 112.216 105.286 111.942 103.602 111.942C88.7468 111.942 74.5 117.843 63.9958 128.347C53.4916 138.851 47.5904 153.097 47.5904 167.952C47.6013 174.637 48.7947 181.267 51.1156 187.536H18.1744C13.3642 187.546 8.75338 189.459 5.34837 192.856C1.94336 196.254 0.0206781 200.86 0 205.67C0.0206781 210.48 1.94336 215.087 5.34837 218.485C8.75338 221.882 13.3642 223.795 18.1744 223.805H886.865C891.675 223.795 896.286 221.882 899.691 218.485C903.096 215.087 905.018 210.48 905.039 205.67C905.018 200.86 903.096 196.254 899.691 192.856C896.286 189.459 891.675 187.546 886.865 187.536H857.331C857.534 185.925 857.639 184.303 857.645 182.679C857.645 171.751 853.303 161.27 845.576 153.543C837.848 145.816 827.367 141.475 816.439 141.475H815.851C816.246 139.185 816.443 136.865 816.439 134.542C816.413 126.398 813.972 118.445 809.425 111.688C804.878 104.932 798.429 99.6758 790.893 96.5855C783.358 93.4952 775.076 92.7094 767.094 94.3274C759.112 95.9454 751.789 99.8946 746.052 105.675C739.711 99.3818 731.499 95.3152 722.649 94.0864C713.799 92.8575 704.79 94.5326 696.973 98.8601C693.016 87.3229 685.542 77.3166 675.601 70.2488C665.661 63.1811 653.754 59.4078 641.557 59.4597C629.36 59.5116 617.486 63.386 607.606 70.538C597.725 77.6901 590.336 87.7597 586.478 99.3301C580.17 95.544 572.958 93.5279 565.601 93.4941Z" fill="white" fill-opacity="0.4"/>
    </svg>`
    //if(stim.taskType === 'instructions' || stim.trialType === 'Number Identification' || stim.trialType === 'Number Comparison') showItem = false
    if(stim.trialType === 'instructions') {
        return (`
        <div id='stimulus-container' style='width: 80%;'>
            <img src=${mediaAssets.images.speakerIcon} id='replay-btn' alt='speaker replay icon'/>
            <p id="prompt">${ stim.prompt }</p>
        </div>` + right_clouds)
    }

    if (task === 'trog' || stim.trialType === 'Number Identification') {
      return (`
        <div id='stimulus-container'>
            <img src=${mediaAssets.images.speakerIcon} id='replay-btn' alt='speaker replay icon'/>
        </div>` // + right_clouds
      )
    } 

    if (stim.audioFile != '') {
        return (
            `<div id='stimulus-container'>
                <img src=${mediaAssets.images.speakerIcon} id='replay-btn' alt='speaker replay icon'/>
                <p id="prompt">${ stim.prompt || stim.item }</p>
                <br>
                ${task === 'egma-math' ? 
                    `<p id="stimulus-html" style="${stim.trialType === 'Number Identification' || stim.trialType === 'Number Comparison' ? "color: transparent;" : ''}">${ stim.item }</p>`
                    :
                    `<img id="stimulus-img" src=${ mediaAssets.images[stim.item] || mediaAssets.images['blank'] }  alt=${ stim.image }/>`
                }
                
            </div>`
        )
    }

}

function getButtonChoices(task, trialType) {
    const stimulus = store.session.get("nextStimulus");
    if (stimulus.trialType === 'instructions' || stimulus.trialType === 'instructions') {
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
    if (stimulus.trialType === 'instructions' || stimulus.trialType === 'instructions') {
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