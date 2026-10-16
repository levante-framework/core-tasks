import _shuffle from 'lodash/shuffle';

function shufflePositions(rowCount: number) {
  const positions: [number, number][] = [];
  for (let i = 1; i <= rowCount; i++) {
    let incrementedJ = false;
    for (let j = 1; j <= rowCount; j += 2) {
      if (i % 2 !== 0 && !incrementedJ) {
        j += 1;
        incrementedJ = true;
      }

      positions.push([i, j] as [number, number]);
    }
  }

  return _shuffle(positions);
}

export function spreadBubbles(bubbles: HTMLButtonElement[], rowCount: number) {
  const positions = shufflePositions(rowCount);

  bubbles.forEach((bubble, i) => {
    const [row, col] = positions[i];
    bubble.style.gridRow = `${row}`;
    bubble.style.gridColumn = `${col}`;
  });
}
