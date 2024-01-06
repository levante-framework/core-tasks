import jsPsychHTMLMultiResponse from "@jspsych-contrib/plugin-html-multi-response";



export const instructions1 = {
    type: jsPsychHTMLMultiResponse,
    data: () => {
        return {
        // save_trial: true,
           assessment_stage: 'instructions' 
        }
    },
    stimulus: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>Instructions</h1>

        <p>
            In this task, you will be given a series of math problems that are appropriate for school-aged children, including simple addition, subtraction, multiplication, and other types of problems. Please take your time to answer the questions correctly. The questions are multiple choice, and you can either use the keyboard arrows or your mouse to select the answer. Thank you for your participation!
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to continue</footer>
    </div>`,
    button_choices: [`Continue`],
    keyboard_choices: 'ALL_KEYS',
    button_html: '<button id="continue-btn">Continue</button>',
    // trial_duration: 1000,
}

export const instructions2 = {
    type: jsPsychHTMLMultiResponse,
    data: () => {
        return {
        // save_trial: true,
           assessment_stage: 'instructions' 
        }
    },
    stimulus: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>About the math task</h1>

        <p>
            There are two different types of questions. Multiple choice and number line response. The multiple choice questions may vary in the amount of choices. For the number line, you may need to drag it to the correct position or respond with a multiple choice option. Additionally, some questions may require you to listen to some audio. To repeat the audio, you can click on the button with the speaker icon in the top right corner. Let's do some practice trials to see what they look like. 
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to continue</footer>
    </div>`,
    button_choices: [`Continue`],
    keyboard_choices: 'ALL_KEYS',
    button_html: '<button id="continue-btn">Continue</button>',
    // trial_duration: 1000,
}


export const postPractice = {
    type: jsPsychHTMLMultiResponse,
    data: () => {
        return {
        // save_trial: true,
           assessment_stage: 'instructions' 
        }
    },
    stimulus: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>Great job!</h1>

        <p>
            Now that you know what to expect lets do the real thing. Good luck!
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to continue</footer>
    </div>`,
    button_choices: [`Continue`],
    keyboard_choices: 'ALL_KEYS',
    button_html: '<button id="continue-btn">Continue</button>',
    // trial_duration: 1000,
}

export const taskFinished = {
    type: jsPsychHTMLMultiResponse,
    data: () => {
        return {
        // save_trial: true,
           assessment_stage: 'instructions' 
        }
    },
    stimulus: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>You've Finished!</h1>

        <p>
            
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to exit</footer>
    </div>`,
    button_choices: [`Continue`],
    keyboard_choices: 'ALL_KEYS',
    button_html: '<button id="continue-btn">Exit</button>',
    // trial_duration: 1000,
}

{/* <p>This will include addition, subtraction, and multiplication.</p>
        <p>Your job is to get through as many questions as you can in the given time.</p>

        <p>Click the button below or press <b>ANY KEY</b> to continue</p> */}


        // <p>In this task, you will be asked different questions about math. 
        //    This will include addition, subtraction, and multiplication.
        //    Your job is to get through as many questions as you can in the given time.
        //    Click the button below or press <b>ANY KEY</b> to continue
        // </p>