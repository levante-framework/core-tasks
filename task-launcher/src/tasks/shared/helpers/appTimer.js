import store from "store2";
import jsPsychCallFunction from "@jspsych/plugin-call-function";

// This feature allows the caller to set a time limit for the app, configured via url and store variable maxTime
// startAppTimer can be added to the timeline after initialTimeline to limit the duration of the entire app 
// thus excluding only the preload time, 
// or can limit only the real trials duration by adding it to the timeline just before the real trials begin 
// thus excluding preload time, instructions, and practice trials
// Call clearAppTimer before exiting

const initAppTimer = () => {
    const maxTime = store.session.get("config").maxTime
    console.log("maxTime is " + maxTime + " minutes");
    
    if (store.session("config").maxTime) {
        // create a timer to flag that it's time to exit the app
        const maxTimeMs = store.session("config").maxTime * 60000;
        
        const timerId = setTimeout(() => {
            store.session.set('maxTimeReached', true); 
            console.log("AppTimer expired after:" + maxTimeMs + "ms");
        }, maxTimeMs);

        store.session.set('maxTimerId', timerId);
    } 

    // init to false, when there is no timeout configured it will never be true
    store.session.set("maxTimeReached", false);
};


// trial to start the application timer
export const startAppTimer = {
    type: jsPsychCallFunction,
    func: function () {
        initAppTimer();
    },
};

// trial to clear the application timer
export const clearAppTimer = {
    type: jsPsychCallFunction,
    func: function () {
        if (store.session("config").maxTimerId) {
            clearTimeout(store.session.get("maxTimerId"));
        } 
    },
};

export const isMaxTimeoutReached = () => {
    return(store.session("maxTimeReached"));
};
