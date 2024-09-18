import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore, PageAudioHandler } from '../helpers';
import { mediaAssets } from '../../..';

export const taskFinished = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => {
    const t = taskStore().translations;
    return `
        <div class='lev-stimulus-container'>
          <div class='lev-row-container instruction'>
            <h1>${t.taskFinished}</h1>
          </div>
            <footer>${t.generalFooter}</footer>
        </div>`;
  },
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: '<button class="primary" style=margin-top:10%>Exit</button>',
  on_load: () => {
    if (mediaAssets.audio.taskFinished) {
      PageAudioHandler.playAudio(mediaAssets.audio.taskFinished)
    }
  }
  // trial_duration: 1000,
};


