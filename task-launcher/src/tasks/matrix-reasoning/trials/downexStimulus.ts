import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { mediaAssets } from '../../..';
import { addPracticeButtonListeners, camelize, PageAudioHandler, PageStateHandler, replayButtonSvg, setupReplayAudio } from '../../shared/helpers';
import { jsPsych } from '../../taskSetup';
import { triggerAnimation } from '../helpers/animateImages';

const replayButtonHtmlId = 'replay-btn-revisited';
let practiceResponses = []
let startTime: number;

export const downexStimulus = (layoutConfigMap: Record<string, LayoutConfigType>) => {
    return {
        type: jsPsychHtmlMultiResponse,
        data: () => {
          const stim = taskStore().nextStimulus;
          let isPracticeTrial = stim.assessmentStage === 'practice_response';
          return {
            // not camelCase because firekit
            save_trial: true,
            assessment_stage: stim.assessmentStage,
            // not for firekit
            isPracticeTrial: isPracticeTrial,
          };
        },
        stimulus: () => {
            const stim = taskStore().nextStimulus;
            const t = taskStore().translations;
            const imageSrc = mediaAssets.images[camelize(stim.item)];

            let itemText;
            const audioFile = stim.audioFile;
            if (typeof audioFile !== 'string') {
                itemText = audioFile.map((file: string) => t[camelize(file)]).join(' ');
            } else {
                itemText = t[camelize(audioFile)];
            }

            return `<div class="lev-stimulus-container">
                        <button
                            id="${replayButtonHtmlId}"
                            class="replay"
                        >
                            ${replayButtonSvg}
                        </button>
                        <div class="lev-row-container instruction-small">
                            <p>${itemText}</p>
                        </div>
                        <div class="lev-stim-content-x-2">
                        <img
                            src=${imageSrc}
                            alt="Image not loading: ${imageSrc}. Please continue the task."
                        />
                        </div>
                    </div>`;
        },
        prompt_above_buttons: true,
        button_choices: () => {
            const stim = taskStore().nextStimulus;
            const itemLayoutConfig = layoutConfigMap?.[stim.itemId];
            const choices = itemLayoutConfig.response.displayValues;

            return choices.map((choice) => {
                const imageUrl = mediaAssets.images[camelize(choice)];

                return `<img src=${imageUrl} alt=${choice} />`;
            });
        },
        keyboard_choices: () => 'NO_KEYS',
        button_html: () => {
            const stim = taskStore().nextStimulus;
            const itemLayoutConfig = layoutConfigMap?.[stim.itemId];
            const classList = [...itemLayoutConfig.classOverrides.buttonClassList];
            if (stim.assessmentStage === 'practice_response') {
                classList.push('practice-btn');
            }

            return `<button class='${classList.join(' ')}'>%choice%</button>`;
        }, 
        on_load: async () => {
            startTime = performance.now();

            const stim = taskStore().nextStimulus;

            // set up replay audio
            const trialAudio = stim.audioFile;
            const pageStateHandler = new PageStateHandler(trialAudio, true);
            setupReplayAudio(pageStateHandler);

            const stimContainer = document.querySelector('.lev-stim-content-x-2');
            const stimImage = stimContainer?.querySelector('img');
            const buttonContainer = document.getElementById('jspsych-html-multi-response-btngroup');
            const buttons = Array.from(buttonContainer?.querySelectorAll('button') || []); 

            const itemLayoutConfig = layoutConfigMap?.[stim.itemId];

            // set up practice button listeners
            const incorrectPracticeResponses: Array<string | null> = [];
            taskStore('incorrectPracticeResponses', incorrectPracticeResponses);

            function onCorrect() {
                PageAudioHandler.playAudio(mediaAssets.audio.feedbackRightOne);
            }

            function onIncorrect() {
                const rspImages = buttons.map(button => button.querySelector('img'));
                const targetImageIdx = rspImages.findIndex(image => image?.alt === stim.answer);

                if (targetImageIdx !== -1) {
                    const targetButton = buttons[targetImageIdx];

                    targetButton.style.animation = 'none';
                    targetButton.offsetHeight; // Force reflow
                    targetButton.style.animation = 'pulse 2s 0s 2';
                }
                
                PageAudioHandler.playAudio(mediaAssets.audio.matrixReasoningFeedbackIncorrectDownex);
            }

            addPracticeButtonListeners(stim, false, itemLayoutConfig, onCorrect, onIncorrect);

            // set up animation
            let itemsToAnimate = [buttons, stimImage];

            const audioConfig: AudioConfigType = {
                restrictRepetition: {
                  enabled: false,
                  maxRepetitions: 2,
                }
              }

            if (typeof trialAudio === 'string') {
                const audioUri = mediaAssets.audio[camelize(trialAudio)] || mediaAssets.audio.nullAudio;
                PageAudioHandler.playAudio(audioUri);
            } else {
                for (const audioFile of trialAudio) {
                    const audioUri = mediaAssets.audio[camelize(audioFile)] || mediaAssets.audio.nullAudio;

                    await new Promise<void>((resolve) => {
                        const configWithCallback = {
                          ...audioConfig,
                          onEnded: () => {
                            if (!(camelize(audioFile) === 'sdsYourTurn')) {
                                itemsToAnimate = triggerAnimation(itemsToAnimate, 'pulse 2s 0s') as any;
                                setTimeout(() => resolve(), 2000);
                            } else {
                                resolve();
                            }
                          }
                        };
                        PageAudioHandler.playAudio(audioUri, configWithCallback);
                      });
                }
            }
        },
        on_finish: (data: any) => {
            PageAudioHandler.stopAndDisconnectNode();

            const stimulus = taskStore().nextStimulus;
            const itemLayoutConfig = layoutConfigMap?.[stimulus.itemId];
            const { corpus } = taskStore();

            let responseValue = null;
            let target = null;
            let responseIndex = null;

            if (itemLayoutConfig) {
                const { response } = itemLayoutConfig;
                if (!response) {
                  throw new Error('Choices not defined in the config');
                }
          
                responseIndex = data.button_response;
                responseValue = response.values[responseIndex];
                target = response.target;
                data.correct = responseValue === target;
            }

            // update running score and answer lists
            if (data.correct) {
                if (stimulus.assessmentStage !== 'practice_response') { // practice trials don't count toward total
                    taskStore.transact('totalCorrect', (oldVal: number) => oldVal + 1);
                    taskStore('numIncorrect', 0); // reset incorrect trial count
                }
                practiceResponses = [];
            } else {
                // Only increase incorrect trials if response is incorrect not a practice trial
                if (stimulus.assessmentStage !== 'practice_response') {
                    taskStore.transact('numIncorrect', (oldVal: number) => oldVal + 1);
                }
            }

            // save data
            jsPsych.data.addDataToLastTrial({
                // specific to this trial
                item: stimulus.item,
                answer: target,
                distractors: stimulus.distractors,
                corpusTrialType: stimulus.trialType,
                responseType: 'mouse',
                responseLocation: responseIndex,
                itemUid: stimulus.itemUid,
                audioFile: stimulus.audioFile,
                corpus: corpus,
                audioButtonPresses: PageAudioHandler.replayPresses,
              });
          
              // corpusId and itemId fields are used by ROAR but not ROAD
              if (taskStore().storeItemId) {
                jsPsych.data.addDataToLastTrial({
                  itemId: stimulus.itemId,
                });
              }
          
              // Adding this seperately or otherwise it will overide
              // the response value added from practice trials
              if (stimulus.assessmentStage !== 'practice_response') {
                jsPsych.data.addDataToLastTrial({
                  response: responseValue,
                });
              }

              if (stimulus.assessmentStage === 'practice_response') {
                const endTime = performance.now();
                const calculatedRt = Math.round(endTime - startTime);
                jsPsych.data.addDataToLastTrial({
                  rt: calculatedRt,
                });
              }

              if (stimulus.assessmentStage === 'test_response') {
                taskStore.transact('testTrialCount', (oldVal: number) => oldVal + 1);
              }
        },
        response_ends_trial: () => {
          const stim = taskStore().nextStimulus;
    
          return stim.assessmentStage !== 'practice_response';
        },
    };
}
