export const getMemoryGameType = (mode, reverse) => {
  if (mode === 'input') {
    return reverse ? 'backward' : 'forward';
  } else {
    return reverse ? 'backward-training' : 'forward-training';
  }
}