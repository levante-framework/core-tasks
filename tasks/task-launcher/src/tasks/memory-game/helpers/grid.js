export function createGrid(x, y, numBlocks, blockSize, gridSize, spacing) {
    let blocks = [];
    let numRows = gridSize;
    let numCols = numBlocks / gridSize;
  
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            let blockX = x + col * (blockSize + spacing);
            let blockY = y + row * (blockSize + spacing);
            blocks.push({ x: blockX, y: blockY });
        }
    }
  
    return blocks;
  }
  
  export function generateRandomSequence(numBlocks, sequenceLength) {
    let sequence = [];
  
    for (let i = 0; i < sequenceLength; i++) {
      let randomNumber = Math.floor(Math.random() * (numBlocks)); 
      sequence.push(randomNumber);
    }
  
    return sequence;
  }