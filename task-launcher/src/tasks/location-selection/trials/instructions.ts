import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { homeIcon, schoolIcon, mapIcon, mapPointerIcon, pointerIcon, keyboardIcon } from '../../shared/helpers';
import { jsPsych } from '../../taskSetup';

const modes = ['gps', 'city_postal', 'map'] as const;

const data = [
  {
    primaryText: "locationText1",
    secondaryText: "locationText2",
    buttonChoices: ['OK'],
    buttonHtml: '<button class="primary">%choice%</button>',
    setMode: false,
  },
  {
    primaryText: "locationText3",
    buttonChoices: () => {
      const t = taskStore().translations;
      return [
        `${homeIcon}${t.locationTextHome}`, 
        `${schoolIcon}${t.locationTextSchool}`, 
        `${mapPointerIcon}${t.locationTextOther}`
      ]
    },
    buttonHtml: '<button class=text-image>%choice%</button>',
    setMode: false,
  },
  {
    primaryText: "locationText4",
    secondaryText: "locationText5",
    buttonChoices: () => {
      const t = taskStore().translations;
      return [
        `${pointerIcon}${t.locationButtonBrowser}`, 
        `${keyboardIcon}${t.locationButtonZip}`, 
        `${mapIcon}${t.locationButtonMap}`
      ]
    },
    buttonHtml: '<button class=text-image>%choice%</button>',
    setMode: true,
  }
]

export const instructions = data.map((instructionData) => {
  return (
    {
      type: jsPsychHtmlMultiResponse,
      stimulus: () => {
        const t = taskStore().translations;
  
        return (
          `
            <div class="lev-stimulus-container">
              <div class="lev-row-container location-selection">
                <h1>${t[instructionData.primaryText] }</h1>
                <p>${instructionData.secondaryText ? t[instructionData.secondaryText] : ''}</p>
              </div>
            </div>
          `
        )
      },
      prompt_above_buttons: true,
      button_choices: instructionData.buttonChoices,
      button_html: instructionData.buttonHtml,
      keyboard_choices: 'NO_KEYS',
      on_load: () => {
        const btnGroup = document.getElementById('jspsych-html-multi-response-btngroup');
        const container = document.querySelector('.lev-row-container.location-selection');
  
        if (btnGroup && container) {
          container.appendChild(btnGroup);
        }

        btnGroup?.classList.add("lev-response-row", "multi-4");
      },
      on_finish: (data: Record<string, any>) => {
        if (instructionData.setMode) {
          const selectedMode = modes[data.button_response];
          taskStore('locationSelectionMode', selectedMode);
        }
      },
    }
  )
});
