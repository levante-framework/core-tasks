import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';

export const instructions1 = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>Instructions</h1>

        <p>
            In this task, you will be given a series of math problems that are appropriate for school-aged children, including simple addition, subtraction, multiplication, and other types of problems. 
            Please take your time to answer the questions correctly. Most of the quuestions are multiple choice, and you can either use the keyboard arrows or your mouse to select the answer.
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to continue</footer>
    </div>`,
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: '<button id="continue-btn">Continue</button>',
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
  stimulus: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>Instructions, continued</h1>

        <p> 
            There will also be some number line problems that require you to drag a slider to the indicated position. 
            Finally, some questions require listening to audio, so please be sure your speakers are on and volume is adjusted. 
            The audio can be repeated by clicking on the button with the speaker icon in the top right corner. 
            Let's begin with a few practice trials.
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to continue</footer>
    </div>`,
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: '<button id="continue-btn">Continue</button>',
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
  stimulus: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>Great job!</h1>

        <p>
            Now that you know what to expect, let's begin. Thank you for your participation!
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to continue</footer>
    </div>`,
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: '<button id="continue-btn">Continue</button>',
  // trial_duration: 1000,
};

export const taskFinished = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>You've completed the task -- thank you!</h1>

        <p>
            
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to exit</footer>
    </div>`,
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: '<button id="continue-btn">Exit</button>',
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
