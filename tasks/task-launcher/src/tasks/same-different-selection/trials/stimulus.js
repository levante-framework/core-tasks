import jsPsychHTMLMultiResponse from "@jspsych-contrib/plugin-html-multi-response"
import store from "store2";
import { updateProgressBar } from "../../shared/helpers";
import { mediaAssets } from "../../..";

export const stimulus = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {}
  },
  stimulus: () => {
      return (
        `<div>
          <h1 id='prompt'>${store.session('nextStimulus').item}</h1>
          <div id='shapes-container'>
            <img src=${mediaAssets.images.lgBlueCircle} alt='stimulus' />
          </div>
        </div>
        `
      )
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
          <img src=${mediaAssets.images.lgRedTriangle} alt='shape' />
         </button>`,
        `<button class='response-btn'>
          <img src=${mediaAssets.images.lgRedTriangle} alt='shape' />
         </button>`
      ]
    }
  },
  on_load: () => {
    console.log(store.session('nextStimulus'))
  },
  on_finish: (data) => {

  }
}