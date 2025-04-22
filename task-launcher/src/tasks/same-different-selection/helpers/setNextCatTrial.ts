import { taskStore } from "../../../taskStore";

export function setNextCatTrial(stimulus: StimulusType) {
    const allSequentialTrials = taskStore().sequentialTrials;
    const nextTrials = allSequentialTrials.filter((trial: StimulusType) => {
        return (trial.trialNumber === stimulus.trialNumber && trial.block_index === stimulus.block_index); 
    });
    
    // manually set the next stimulus here if there are remaining trials in the block
    if (nextTrials.length > 0) {
        const nextStim = nextTrials[0];
        taskStore("nextStimulus", nextStim);
        const newSequentialTrials = allSequentialTrials.filter((trial: StimulusType) => {
            return (trial.itemId !== nextStim.itemId);
        });
    
        taskStore("sequentialTrials", newSequentialTrials);
    }
}
