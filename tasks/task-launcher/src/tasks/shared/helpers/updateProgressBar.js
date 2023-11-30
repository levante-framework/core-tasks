export const updateProgressBar = () => {
    const currProgressBar = jsPsych.getProgressBarCompleted();
  
    const totalTrials = store
      .session("stimulusCountList")
      .reduce((a, b) => a + b, 0);
  
    jsPsych.setProgressBar(currProgressBar + 1 / totalTrials);
  };