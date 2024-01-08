import jsPsychHTMLMultiResponse from "@jspsych-contrib/plugin-html-multi-response"
import store from "store2";
import { updateProgressBar } from "../../shared/helpers";
import { mediaAssets } from "../../..";

export const audioContext = new Audio();

export const stimulus = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {}
  },
  stimulus: () => {
    if (store.session.get('nextStimulus').source === 'phase-1') {
      return (
        `<div>
          <h1>Are these two shapes similar in any way?</h1>
          <div id='shapes-container'>
            <div class='shape'>
              <img src=${mediaAssets.images[store.session.get('nextStimulus').similar1]} alt='shape1' />
            </div>
            <div class='shape'>
              <img src=${mediaAssets.images[store.session.get('nextStimulus').similar2]} alt='shape2' />
            </div>
          </div>
        </div>
        `
      )
    } else {
      return (
        `<div>
          <h1 id='prompt'>Which of the pictures is the same as this new picture?</h1>
          <div id='shapes-container'>
            <img src=${mediaAssets.images[store.session.get('nextStimulus').item]} alt='stimulus' />
          </div>
        </div>
        `
      )
    }
    
  },
  button_choices: () => {
    return ['Yes', 'No']
  },
  button_html: () => {
    if (store.session.get('nextStimulus').source === 'phase-1') {
      return ["<button id='response-yes' class='response-btn'>%choice%</button>", "<button id='response-no' class='response-btn'>%choice%</button>"]
    } else {
      return [
        `<button  class='response-btn'>
          <img src=${mediaAssets.images[store.session.get('nextStimulus').target]}
         </button>`,
        `<button class='response-btn'>
          <img src=${mediaAssets.images[store.session.get('nextStimulus').distractor1]}
         </button>`
      ]
    }
  },
  on_load: () => {

  },
  on_finish: (data) => {

  }
}