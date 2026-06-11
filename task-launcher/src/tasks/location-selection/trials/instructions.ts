import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { 
  homeIcon, 
  schoolIcon, 
  mapIcon, 
  mapPointerIcon, 
  pointerIcon, 
  keyboardIcon,
  worldSearchIcon, 
} from '../../shared/helpers';
import { jsPsych } from '../../taskSetup';

const modes = ['city_postal', 'map', 'gps'];

const data = [
  {
    primaryText: "locationText1",
    secondaryText: "locationText2",
    topIcon: worldSearchIcon,
    buttonChoices: () => {
      const t = taskStore().translations;

      return [t.continueButtonText];
    },
    buttonHtml: '<button class="primary">%choice%</button>',
    setMode: false,
    setLocationType: false,
  },
  {
    primaryText: "locationText3",
    buttonChoices: () => {
      const t = taskStore().translations;
      return [
        `${homeIcon}${t.locationTextHome}`,
        `${mapPointerIcon}${t.locationTextOther}`
      ]
    },
    buttonHtml: '<button class=text-image>%choice%</button>',
    setMode: false,
    setLocationType: true,
  },
  {
    primaryText: "locationText4",
    secondaryText: "locationText5",
    buttonChoices: () => {
      const t = taskStore().translations;

      const buttons = [
        `${keyboardIcon}${t.locationButtonZip}`, 
        `${mapIcon}${t.locationButtonMap}`
      ];

      if (taskStore().locationType === "Home") {
        buttons.push(`${pointerIcon}${t.locationButtonBrowser}`)
      }

      return buttons;
    },
    buttonHtml: '<button class=text-image>%choice%</button>',
    setMode: true,
    setLocationType: false,
  },
  {
    primaryText: "locationTextBrowser1",
    secondaryText: "locationTextBrowser2",
    topIcon: worldSearchIcon,
    buttonChoices: () => {
      const t = taskStore().translations;

      return [t.locationButtonPermission];
    },
    buttonHtml: '<button class="primary">%choice%</button>',
    setMode: false,
    setLocationType: false,
  },
  {
    primaryText: "locationText6",
    topIcon: worldSearchIcon,
    buttonChoices: () => {
      const t = taskStore().translations;

      return [t.locationButtonFinish];
    },
    buttonHtml: '<button class="primary">%choice%</button>',
    setMode: false,
    setLocationType: false,
  },
]

const allInstructions = data.map((instructionData) => {
  return {
      type: jsPsychHtmlMultiResponse,
      stimulus: () => {
        const t = taskStore().translations;
  
        return (
          `
            <div class="lev-stimulus-container">
              <div class="lev-row-container location-selection">
                ${instructionData.topIcon || ''}
                <h1>${t[instructionData.primaryText] }</h1>
                <t>${instructionData.secondaryText ? t[instructionData.secondaryText] : ''}</t>
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

        if (instructionData.setLocationType) {
          const responseIdx = data.button_response;
          const locationType = ['Home', 'Other'][responseIdx];
          taskStore('locationType', locationType);

          jsPsych.data.addDataToLastTrial({
            response: locationType 
          });
        }
      },
    };
});

export const finishTaskMessage = allInstructions.pop();
export const gpsInstructions = allInstructions.pop();
export const modeSelectInstructions = allInstructions.pop();

export const instructions = allInstructions;
