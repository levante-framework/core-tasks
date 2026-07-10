function shufflePositions() {
    const positions = [
        [1,1],[1,3],[1,5],
        [2,2],[2,4],
        [3,1],[3,3],[3,5],
        [4,2],[4,4],
        [5,1],[5,3],[5,5],
    ];
    return positions.sort(() => Math.random() - 0.5);
  }
  
export function spreadBubbles(bubbles: HTMLButtonElement[]) {
    const positions = shufflePositions();

    bubbles.forEach((bubble, i) => {
      const [row, col] = positions[i];
      bubble.style.gridRow = `${row}`;
      bubble.style.gridColumn = `${col}`;
    });
}
