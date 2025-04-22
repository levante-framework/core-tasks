import { taskStore } from "../../taskStore";
import { setupSds } from "./helpers/prepareSdsCorpus";
import { createPreloadTrials, initTimeline, initTrialSaving, prepareCorpus, prepareMultiBlockCat } from "../shared/helpers";
import { stimulus } from "./trials/stimulus";
import { afcMatch } from "./trials/afcMatch";
import { enterFullscreen, exitFullscreen, finishExperiment, fixationOnly, getAudioResponse, setupStimulusFromBlock, taskFinished } from "../shared/trials";
import { setTrialBlock } from "./helpers/setTrialBlock";
import { matchDemo1, matchDemo2, somethingSameDemo1, somethingSameDemo2, somethingSameDemo3 } from "./trials/heavyInstructions";
import { dataQualityScreen } from "../shared/trials/dataQuality";
import { initializeCat, jsPsych } from "../taskSetup";

export default function buildSameDifferentTimelineCat(config: Record<string, any>, mediaAssets: MediaAssetsType) {
    const preloadTrials = createPreloadTrials(mediaAssets).default;
    const heavy: boolean = taskStore().heavyInstructions; 
    
    const corpus: StimulusType[] = taskStore().corpora.stimulus;
    const preparedCorpus = prepareCorpus(corpus);

    const catCorpus = setupSds(taskStore().corpora.stimulus)
    const allBlocks = prepareMultiBlockCat(catCorpus); 
            
    const newCorpora = {
        practice: taskStore().corpora.practice,
        stimulus: allBlocks
    }
    taskStore('corpora', newCorpora); // puts all blocks into taskStore
    
    initTrialSaving(config);
    const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);
    
    const buttonNoise = {
        timeline: [getAudioResponse(mediaAssets)],
    
        conditional_function: () => {
        const trialType = taskStore().nextStimulus.trialType;
        const assessmentStage = taskStore().nextStimulus.assessmentStage;
    
        if ((trialType === 'something-same-2' || trialType.includes('match')) && assessmentStage != 'practice_response') {
            return true;
        }
        return false;
        },
    };
    
    // used for instruction and practice trials
    const ipBlock = (trial: StimulusType) => {
        return {
            timeline: [{ ...fixationOnly, stimulus: '' }, stimulus(trial)],
        };
    };
    
    // returns timeline object containing the appropriate trials - only runs if they match what is in taskStore
    function runCatTrials(trialNum: number, trialType: 'stimulus' | 'afc') {
        const timeline = []; 
        for (let i = 0; i < trialNum; i++) {
            if (trialType === 'stimulus') {
                timeline.push(stimulus());
                timeline.push(buttonNoise);
            } else {
                timeline.push(afcMatch);
                timeline.push(buttonNoise); 
            }
        
            if (i < trialNum - 1) {
                timeline.push({...fixationOnly, stimulus: ''});
            }
        }
    
        return {
            timeline: timeline, 
            conditional_function: () => {
                const stimulus = taskStore().nextStimulus;
        
                if (trialType === 'stimulus') {
                return (
                    (stimulus.trialType === "test-dimensions" && trialNum === 1) ||
                    (stimulus.trialType.includes("something-same") && trialNum === 2)
                );
                } else {
                    return (stimulus.trialType === trialNum + "-match");
                }
            }
        }
    }

    const timeline = [preloadTrials, initialTimeline];

    // all instructions + practice trials
    const instructionPractice: StimulusType[] = heavy ? preparedCorpus.ipHeavy : preparedCorpus.ipLight;

    // returns practice + instruction trials for a given block
    function getPracticeInstructions(blockNum: number): StimulusType[] {
        return instructionPractice.filter((trial) => trial.blockIndex == blockNum);
    }
    
    // create list of numbers of trials per block
    const blockCountList = setTrialBlock(true); 
    
    const totalRealTrials = blockCountList.reduce((acc, total) => acc + total, 0);
    taskStore('totalTestTrials', totalRealTrials);
    
    blockCountList.forEach((count, index) => {
        const currentBlockInstructionPractice = getPracticeInstructions(index);
        
        // push in instruction + practice trials
        if (index === 1 && heavy) {
            // something's the same block has demo trials in between instructions
            const firstInstruction = currentBlockInstructionPractice.shift();
            if (firstInstruction != undefined) {
            timeline.push(ipBlock(firstInstruction));
            }
    
            timeline.push(somethingSameDemo1);
            timeline.push(somethingSameDemo2);
            timeline.push(somethingSameDemo3);
        }
    
        currentBlockInstructionPractice.forEach((trial) => {
            timeline.push(ipBlock(trial));
        });
    
        if (index === 2 && heavy) {
            // 2-match has demo trials after instructions
            timeline.push(matchDemo1);
            timeline.push(matchDemo2);
        }

        const numOfTrials = (index === 0) ? count : count / 2; // change this based on simulation results?
        for (let i = 0; i < numOfTrials; i++) {
            timeline.push({...setupStimulusFromBlock(index), stimulus: ''});
    
            if (index === 0) {
            timeline.push(runCatTrials(1, "stimulus"));
            } 
            if (index === 1) {
            timeline.push(runCatTrials(2, "stimulus"));
            }
            if (index === 2) {
            timeline.push(runCatTrials(2, "afc"));
            timeline.push(runCatTrials(3, "afc"));
            timeline.push(runCatTrials(4, "afc"));
            }
        }
    });

    initializeCat();
    
    if (heavy) {
        timeline.push(dataQualityScreen);
    }
    timeline.push(taskFinished());
    timeline.push(exitFullscreen);
    return { jsPsych, timeline };
}

 
