import store from "store2";

// This feature allows the caller to set a time limit for the app, configured via url and store variable maxTime
// the preload time is not included in the time limit
// initAppTimer() can be called in initTimeline to limit the duration of the entire app 
// Be sure to call clearTimeout() before exiting

export const initAppTimer = () => {
    const maxTime = store.session.get("config").maxTime
    //console.log("maxTime is " + maxTime + " minutes");
    
    if (store.session("config").maxTime) {
        // create a timer to flag that it's time to exit the app
        const maxTimeMs = store.session("config").maxTime * 60000;
        
        const timerId = setTimeout(() => {
            store.session.set('maxTimeReached', true); 
            //console.log("AppTimer expired after:" + maxTimeMs + "ms");
        }, maxTimeMs);

        store.session.set('maxTimerId', timerId);
    } 

    // init to false, when there is no timeout configured it will never be true
    store.session.set("maxTimeReached", false);
};


export const isMaxTimeoutReached = () => {
    return(store.session("maxTimeReached"));
};
