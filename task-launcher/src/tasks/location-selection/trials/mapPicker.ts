import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { getLocationSelectionDraft } from '../helpers/state';
import { setupMap } from '../helpers/map';
import { disableOkButton } from '../../shared/helpers';
import { buildLocationSavePayload } from '../helpers/locationCommitPreview';
import { jsPsych } from '../../taskSetup';

export const mapPicker = {
  timeline: [
    {
      type: jsPsychHtmlMultiResponse,
      stimulus: () => {
        const t = taskStore().translations;
        
        return (
          `
            <div class="lev-stimulus-container">
              <div class="lev-row-container instruction location-selection">
                <h1>${t.locationTextMap1}</h1>
                <div id="location-map-picker" class="location-map-picker"></div>
              </div>
            </div>
          `
        );
      },
      prompt_above_buttons: true,
      button_choices: () => {
        const t = taskStore().translations;

        return [t.locationButtonConfirm];
      },
      button_html: '<button class="primary">%choice%</button>',
      keyboard_choices: 'NO_KEYS',
      on_load: async () => {
        const btnGroup = document.getElementById('jspsych-html-multi-response-btngroup');
        const container = document.querySelector('.lev-row-container.location-selection');
  
        if (btnGroup && container) {
          container.appendChild(btnGroup);
        }
        btnGroup?.classList.add("lev-response-row", "multi-4");
        disableOkButton();
      
        setupMap();
      },
      on_finish: async () => {
        const location = await buildLocationSavePayload();

        jsPsych.data.addDataToLastTrial({
          location: location
        });
      }
    },
  ],
  conditional_function: () => taskStore().locationSelectionMode === 'map',
};
