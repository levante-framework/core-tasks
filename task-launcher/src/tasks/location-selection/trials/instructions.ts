import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';

export const instructions = [
  {
    type: jsPsychHtmlMultiResponse,
    stimulus: `
      <div class="lev-stimulus-container">
        <div class="lev-row-container instruction">
          <h2>Location Selection</h2>
          <p>You can share an approximate location using GPS, map selection, or city/postal search.</p>
          <p>This task is scaffolded to match core-tasks UI flow and data capture style.</p>
        </div>
      </div>
    `,
    prompt_above_buttons: true,
    button_choices: ['Continue'],
    button_html: '<button class="primary">%choice%</button>',
    keyboard_choices: 'NO_KEYS',
    data: {
      assessment_stage: 'instructions',
      task: 'location-selection',
    },
  },
];
