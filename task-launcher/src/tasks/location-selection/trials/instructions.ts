import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';

export const instructions = [
  {
    type: jsPsychHtmlMultiResponse,
    stimulus: `
      <div class="lev-stimulus-container">
        <div class="lev-row-container instruction">
          <h2>Share your location (privacy-first)</h2>
          <p>Pick the method that is easiest for you. You can use GPS, tap a map, or search by city/postal code.</p>
          <p>We only need an approximate location for planning and analysis.</p>
          <div style="margin-top: 1rem; text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 0.9rem;">
            <p style="margin: 0 0 0.4rem 0;"><strong>What to expect:</strong></p>
            <p style="margin: 0.2rem 0;">- GPS: uses your browser location permission.</p>
            <p style="margin: 0.2rem 0;">- Map: click a point in the United States.</p>
            <p style="margin: 0.2rem 0;">- City/Postal: choose from suggested places after selecting a country.</p>
          </div>
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
