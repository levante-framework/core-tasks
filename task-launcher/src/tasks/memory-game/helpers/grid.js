export function createGrid(x, y, numBlocks, blockSize, gridSize, spacing) {
  const blocks = [];
  const numRows = gridSize;
  const numCols = numBlocks / gridSize;

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const blockX = x + col * (blockSize + spacing);
      const blockY = y + row * (blockSize + spacing);
      blocks.push({ x: blockX, y: blockY });
    }
  }

  return blocks;
}

export function generateRandomSequence(
  numBlocks, 
  sequenceLength,
  isPractice = false
) {
  const sequence = [];

  for (let i = 0; i < sequenceLength; i++) {
    let randomNumber = Math.floor(Math.random() * numBlocks);

    // Avoid highlighting the same square twice in a row
    while (isPractice && sequence.includes(randomNumber)) {
      randomNumber = Math.floor(Math.random() * numBlocks);
    }

    sequence.push(randomNumber);
  }

  return sequence;
}
