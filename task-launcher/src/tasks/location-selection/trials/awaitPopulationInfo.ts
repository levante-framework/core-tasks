import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { worldSearchIcon, isTaskFinished, loader } from '../../shared/helpers';
import { jsPsych } from '../../taskSetup';


export const waitScreen = {
        timeline: [
            {
                type: jsPsychHtmlMultiResponse,
                stimulus: () => {
                  const t = taskStore().translations;

                  return (
                    `
                      <div class="lev-stimulus-container">
                        <div class="lev-row-container location-selection">
                          ${worldSearchIcon}
                          <h1>${t.locationText7}</h1>
                          ${loader}
                        </div>
                      </div>
                    `
                  )
                },
                keyboard_choices: 'NO_KEYS',
                on_load: async () => {
                    await isTaskFinished(() => taskStore().locationDataSaved);
                    jsPsych.finishTrial();
                },
            }
        ]
        
};
