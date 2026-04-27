import { taskStore } from "../../../taskStore";

export function prepareTomCorpus(blockList: StimulusType[][]) {
    const sequentialTrials: StimulusType[] = [];
    const newCorpus: StimulusType[] = [];

    blockList.forEach((block: StimulusType[]) => {
        const firstTrial = block[0];
        const remainingTrials = block.slice(1);

        newCorpus.push(firstTrial);
        sequentialTrials.push(...remainingTrials);
    });

    taskStore('sequentialTrials', sequentialTrials);
    taskStore('corpora', { stimulus: newCorpus });
}
