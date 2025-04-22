import { taskStore } from "../../../taskStore";

export function setTrialBlock(cat: boolean) {
    // create list of numbers of trials per block
    const blockCountList: number[] = [];
    let testDimPhase2: boolean = false;

    cat ? 
    taskStore().corpora.stimulus.forEach((block: StimulusType[]) => {
        blockCountList.push(block.length); 
    }) :
    taskStore().corpora.stimulus.forEach((trial: StimulusType) => {
        // if not running a CAT, trials are blocked by their type 
        let trialBlock: number; 
        switch (trial.trialType) {
            case "test-dimensions":
                trialBlock = testDimPhase2 ? 3 : 0; 
                break;
            case "something-same-1":
                testDimPhase2 = true; 
                trialBlock = 1; 
                break; 
            case "something-same-2":
                trialBlock = 1; 
                break;
            case "2-match": 
                trialBlock = 2; 
                break; 
            case "3-match":
                trialBlock = 4; 
                break; 
            case "4-match":
                trialBlock = 5;
                break;
            default:
                trialBlock = NaN;
                break;
        }   
    
        if (!Number.isNaN(trialBlock)) {
            blockCountList[trialBlock] = (blockCountList[trialBlock] || 0) + 1; 
        }
    });

    return blockCountList; 
}
