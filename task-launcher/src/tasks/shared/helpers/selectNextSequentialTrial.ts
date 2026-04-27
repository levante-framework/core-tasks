import { taskStore } from '../../../taskStore';

// selects the next trial in a block of sequential trials
export function selectNextSequentialTrial(nextTrials: StimulusType[]): void {
  if (nextTrials.length === 0) {
    return;
  }

  const allSequentialTrials = taskStore().sequentialTrials;

  const nextStim = nextTrials[0];
  taskStore('nextStimulus', nextStim);
  const newSequentialTrials = allSequentialTrials.filter((trial: StimulusType) => trial.itemId !== nextStim.itemId);
  taskStore('sequentialTrials', newSequentialTrials);
}
