export function createGrid({x, y, numOfBlocks, blockSize, gridSize, blockSpacing}) {
  const blocks = [];
  const numRows = gridSize;
  const numCols = numOfBlocks / gridSize;

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const blockX = x + col * (blockSize + blockSpacing);
      const blockY = y + row * (blockSize + blockSpacing);
      blocks.push({ x: blockX, y: blockY });
    }
  }

  return blocks;
}

export function generateRandomSequence({
  numOfBlocks, 
  sequenceLength,
  previousSequence = null
}) {
  const sequence = [];

  for (let i = 0; i < sequenceLength; i++) {
    const randomNumber = Math.floor(Math.random() * numOfBlocks);

    // Avoid highlighting the same square twice in a row, 
    // even across trial sequences

    // Check the last square in the previous sequence
    if (
      i == 0 && 
      previousSequence && 
      previousSequence[previousSequence.length - 1] === randomNumber
    ) {
      i--;
      continue;
    }

    // Check the previous square in the current sequence
    if (sequence[sequence.length - 1] === randomNumber) {
      i--;
      continue;
    }

    sequence.push(randomNumber);
  }

  return sequence;
}
