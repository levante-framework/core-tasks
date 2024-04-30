import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { mediaAssets } from '../../..';
import { prepareChoices } from '../../shared/helpers';
import { camelize } from '@bdelab/roar-utils';

export const stimulus = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    return {};
  },
  stimulus: () => {
    const stimulus = store.session.get('nextStimulus');
    const file = camelize(stimulus.audioFile);
    return mediaAssets.audio[file];
  },
  prompt: () => {
    const stim = store.session.get('nextStimulus');
    const audiofile = camelize(stim.audioFile);
    const t = store.session.get('translations');
    let html = `<div id='stimulus-container'>
          <h1 id='prompt'>${t[audiofile]}</h1>
          <div >`;
    if (stim.image != '') {
      let img = mediaAssets.images[camelize(stim.image)];

      html =
        html +
        `<div id='js-psych-multi-response-button-group'><button class='img-btn'> <img src=` +
        img +
        ` alt='stimulus' /></button></div>`;
    }
    if (stim.trialType == 'something-same-1') {
      let foo = prepareChoices(stim.answer, stim.distractors);
      let choices = store.session.get('choices');
      let all_buttons = choices.map((choice, ind) => {
        var img = mediaAssets.images[camelize(choice)];
        var button_html = "<button class='img-btn'> <img src=" + img + " alt='shape' /> </button>";

        return button_html;
      });
      //html += "<div id='jspsych-audio-multi-response-btn-group'>";
      for (let i = 0; i < all_buttons.length; i++) {
        html += all_buttons[i];
      }
      //html += '</div>';
    }
    html =
      html +
      `</div>
        </div>
        `;
    return html;
  },
  prompt_above_buttons: true,
  button_choices: () => {
    let stim = store.session.get('nextStimulus');
    if (stim.trialType == 'something-same-2') {
      return store.session.get('choices');
    } else if (stim.trialType == 'something-same-1') {
      return ['OK'];
    }
    let foo = prepareChoices(stim.answer, stim.distractors);
    return foo.choices;
  },
  button_html: () => {
    let stim = store.session.get('nextStimulus');
    if (stim.trialType == 'something-same-1') {
      return "<button id='continue-btn'>OK</button>";
    }
    let choices = store.session.get('choices');
    let all_buttons = choices.map((choice, ind) => {
      var img = mediaAssets.images[camelize(choice)];
      var html = "<button class='img-btn'> <img src=" + img + " alt='shape' /> </button>";

      return html;
    });
    return all_buttons;
  },
  on_load: function () {},
  on_finish: (data) => {},
};
