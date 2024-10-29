export const getMemoryGameType = (mode: 'input' | 'display', reverse: boolean) => {
  if (mode === 'input') {
    return reverse ? 'backward' : 'forward';
  } else {
    return reverse ? 'backward-training' : 'forward-training';
  }
}
