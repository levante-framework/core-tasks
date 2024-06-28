import { taskStore } from '.';

function createBlocks(numOfBlocks: number, numOfTrials: number) {
  // Minimum number of trials. Can change to whatever.
  if (numOfTrials < 3) numOfTrials = 4;
  const baseFraction = Math.floor(numOfTrials / numOfBlocks);
  const remainder = Math.round(numOfTrials % numOfBlocks);

  const blocks = [];

  for (let i = 0; i < numOfBlocks; i++) {
    blocks.push(baseFraction);
  }

  // Distribute the remainder among the first few fractions
  for (let i = 0; i < remainder; i++) {
    blocks[i]++;
  }

  return blocks;
}

// get size of blocks
export const getStimulusBlockCount = (numberOfTrials: number, stimulusBlocks: number) => {
  const maxNumberOfTrials = taskStore().totalTrials;

  let countList;

  if (numberOfTrials > maxNumberOfTrials) {
    countList = createBlocks(stimulusBlocks, maxNumberOfTrials);
  } else {
    countList = createBlocks(stimulusBlocks, numberOfTrials);
  }

  return countList;
};
