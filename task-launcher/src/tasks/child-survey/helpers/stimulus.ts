import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { camelize, equalizeButtonSizes, handleStaggeredButtons, PageAudioHandler, PageStateHandler, replayButtonSvg, setSentryContext } from '../../shared/helpers';
import { mediaAssets } from '../../..';
import { jsPsych } from '../../taskSetup';

const replayButtonHtmlId = 'replay-btn-revisited';
let startTime: number;

export const surveyItem = (
    {
    responseAllowed,
    promptAboveButtons,
    task,
    layoutConfigMap,
  }: {
    responseAllowed: boolean;
    promptAboveButtons: boolean;
    task: string;
    layoutConfigMap: Record<string, LayoutConfigType>;
  }
) => {
  return {
    type: jsPsychHtmlMultiResponse,
    data: () => {
      const stim = taskStore().nextStimulus;
      return {
        save_trial: true,
        assessment_stage: stim.assessmentStage,
        isPracticeTrial: false,
      };
    },
    stimulus: () => {
      const stim = taskStore().nextStimulus;
      const t = taskStore().translations;
      const prompt = stim.audioFile; 

      return `<div class="lev-stimulus-container">
        <button
          id="${replayButtonHtmlId}"
          class="replay"
        >
          ${replayButtonSvg}
        </button>
          <div class="lev-row-container instruction-small">
              <p>${t[camelize(prompt)]}</p>
          </div>
      </div>`;
    },
    prompt_above_buttons: promptAboveButtons,
    button_choices: () => {
        const stim = taskStore().nextStimulus;
        const itemLayoutConfig: LayoutConfigType = layoutConfigMap?.[stim.itemId];
        
        return itemLayoutConfig.response.values;
    },
    button_html: () => {
        const stim = taskStore().nextStimulus;
        const itemLayoutConfig: LayoutConfigType = layoutConfigMap?.[stim.itemId];

        return `<button class='${itemLayoutConfig.classOverrides.buttonClassList.join(' ')}'>%choice%</button>`
    }, 
    on_load: () => {
        const stim = taskStore().nextStimulus;

        // play trial audio
        PageAudioHandler.playAudio(mediaAssets.audio[camelize(stim.audioFile)]);
      
        startTime = performance.now();
        
        const itemLayoutConfig: LayoutConfigType = layoutConfigMap?.[stim.itemId];
        const playAudioOnLoad = itemLayoutConfig?.playAudioOnLoad;
        const pageStateHandler = new PageStateHandler(stim.audioFile, playAudioOnLoad);
      
        // Setup Sentry Context
        setSentryContext({
          itemId: stim.itemId,
          taskName: stim.task,
          pageContext: 'stimulus',
        });
      
        if (stim.trialType !== 'instructions') {
          const buttonClass = itemLayoutConfig.classOverrides.buttonClassList[0]; 
          const responseButtonChildren = document.querySelectorAll(`button.${buttonClass}`)
          const minFontSize = 10;
    
          equalizeButtonSizes(responseButtonChildren as NodeListOf<HTMLButtonElement>);

          if (itemLayoutConfig.isStaggered) {
          // Handle the staggered buttons
          const buttonContainer = document.getElementById('jspsych-html-multi-response-btngroup') as HTMLDivElement;
          let audioKeys: string[] = [
            'child-survey-response1', 
            'child-survey-response2', 
            'child-survey-response3', 
            'child-survey-response4',
          ];
      
          handleStaggeredButtons(pageStateHandler, buttonContainer, audioKeys);
        }

          // update the trial number
          taskStore.transact('trialNumSubtask', (oldVal: number) => oldVal + 1);
        }
    },
    on_finish: (data: any) => {
      PageAudioHandler.stopAndDisconnectNode();

      let responseValue = null;
      let responseIndex = null;
      
      const corpus = taskStore().corpus;
      const stim = taskStore().nextStimulus;
      const itemLayoutConfig: LayoutConfigType = layoutConfigMap?.[stim.itemId];
      
      
      if (stim.trialType !== 'instructions') {
        if (itemLayoutConfig) {
          const { response } = itemLayoutConfig;
         
          if (!response) {
            throw new Error('Choices not defined in the config');
          }  
          responseIndex = data.button_response;
          responseValue = response.values[responseIndex];
        }
      
        jsPsych.data.addDataToLastTrial({
          // specific to this trial
          item: stim.item,
          distractors: stim.distractors,
          corpusTrialType: stim.trialType,
          responseLocation: responseIndex,
          itemUid: stim.itemUid,
          audioFile: stim.audioFile,
          corpus: corpus,
          audioButtonPresses: PageAudioHandler.replayPresses,
          correct: false,
        });
      
        // corpusId and itemId fields are used by ROAR but not ROAD
        if (taskStore().storeItemId) {
          jsPsych.data.addDataToLastTrial({
            corpusId: taskStore().corpusId,
            itemId: stim.itemId,
          });
        }
      } else {
        jsPsych.data.addDataToLastTrial({
          // false because it's not a real trial
          correct: false,
        });
      }
      
      if (stim.assessmentStage === 'test_response') {
        taskStore.transact('testTrialCount', (oldVal: number) => oldVal + 1);
      }
    },
    response_ends_trial: true
  };
};
