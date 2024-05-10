import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import store from 'store2';

export const instructions1 = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => {
    const t = store.session.get('translations');
    return `<div class='instructions-container'>
        <h1 class='instructions-title'>${t.instructions}</h1>

        <p>
            ${t.mathAdultInstructions1}
        </p>

        <footer>${t.generalFooter}</footer>
    </div>`;
  },
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: () => {
    const t = store.session.get('translations');
    return `<button id="continue-btn">${t.continueButtonText}</button>`;
  },
  // trial_duration: 1000,
};

export const instructions2 = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => {
    const t = store.session.get('translations');
    return `<div class='instructions-container'>
        <h1 class='instructions-title'>${t.instructions}</h1>

        <p> 
            ${t.mathAdultInstructions2}
        </p>

        <footer>${t.generalFooter}</footer>
    </div>`;
  },
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: () => {
    const t = store.session.get('translations');
    return `<button id="continue-btn">${t.continueButtonText}</button>`;
  },
  // trial_duration: 1000,
};

export const postPractice = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => {
    const t = store.session.get('translations');
    return `<div class='instructions-container'>
        <h1 class='instructions-title'>Great job!</h1>

        <p>
            ${t.mathPostPractice}
        </p>

        <footer>${t.generalFooter}</footer>
    </div>`;
  },
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: () => {
    const t = store.session.get('translations');
    return `<button id="continue-btn">${t.continueButtonText}</button>`;
  },
  // trial_duration: 1000,
};

{
  /* <p>This will include addition, subtraction, and multiplication.</p>
        <p>Your job is to get through as many questions as you can in the given time.</p>

        <p>Click the button below or press <b>ANY KEY</b> to continue</p> */
}

// <p>In this task, you will be asked different questions about math.
//    This will include addition, subtraction, and multiplication.
//    Your job is to get through as many questions as you can in the given time.
//    Click the button below or press <b>ANY KEY</b> to continue
// </p>
