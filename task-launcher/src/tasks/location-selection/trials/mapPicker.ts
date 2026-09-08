import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { setupMap } from '../helpers/map';
import { disableOkButton } from '../../shared/helpers';
import { buildLocationSavePayload } from '../helpers/locationCommitPreview';
import { jsPsych } from '../../taskSetup';
import { fetchAirQuality } from '../helpers/airQuality';
import { fetchCoarseWeather, pickCoarseWeatherQueryPoint} from '../helpers/openMeteo';
import { lookupPopulationDensity } from '../helpers/populationDensity';

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
        taskStore('userWentBack', false);
        const courseLocation = await buildLocationSavePayload();
          let weather, popDensity, airQuality;
          
          const lat = taskStore().locationSelectionDraft?.lat;
          const lon = taskStore().locationSelectionDraft?.lon;


          if (lat && lon) {
            const queryPoint = pickCoarseWeatherQueryPoint({ gps: { lat, lon } });
            weather = queryPoint ? await fetchCoarseWeather({ ...queryPoint }) : null;
            popDensity = lookupPopulationDensity(lat,lon);
            airQuality = fetchAirQuality(lat,lon);
          }
          
          jsPsych.data.addDataToLastTrial({
            location: courseLocation, 
            weather: weather,
            popDensity: popDensity, 
            airQuality: airQuality,
          });
      }
    },
  ],
  conditional_function: () => taskStore().locationSelectionMode === 'map',
};
