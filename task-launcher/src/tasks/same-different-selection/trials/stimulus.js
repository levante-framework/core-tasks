import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import store from 'store2';
import { updateProgressBar } from '../../shared/helpers';
import { mediaAssets } from '../../..';

export const stimulus = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {};
  },
  stimulus: () => {
    return `<div id='stimulus-container'>
          <h1 id='prompt'>${
            store.session('nextStimulus').item ||
            'Here is another picture. Which of the pictures is the same as this one [Point to the new picture]'
          }</h1>
          <div >
            <img id='stimulus-img' src=${mediaAssets.images.lgBlueCircle} alt='stimulus' />
          </div>
        </div>
        `;
  },
  button_choices: () => {
    return ['Yes', 'No'];
  },
  button_html: () => {
    return [
      `<button class='img-btn'>
        <img src=${mediaAssets.images.lgRedTriangle} alt='shape' />
        </button>`,
      `<button class='img-btn'>
        <img src=${mediaAssets.images.lgRedTriangle} alt='shape' />
        </button>`,
    ];
  },
  on_load: () => {
    console.log(store.session('nextStimulus'));
  },
  on_finish: (data) => {},
};
