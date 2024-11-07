import _shuffle from 'lodash/shuffle';

export function shuffleStories(corpus: StimulusType[], inferenceNumStories: number | null, storyKey: string, typesToAvoid: string[], numItemsPerStory: number) {
  const shuffledStoryCorpus = [];
  const storyMap: Record<string, boolean> = {};
  corpus.forEach(c => {
    const storyName = c[storyKey as keyof typeof c] as string;
    if (!(storyName in storyMap) && typesToAvoid.indexOf(storyName) < 0) {
      // If key not present and it does not belong to values to avoid push
      storyMap[storyName] = true;
    }
  });
  const stories = Object.keys(storyMap);
  const shuffledStories = _shuffle(stories);
  for (let i = 0; i < (inferenceNumStories ?? 15); i += 1) {
    const story = shuffledStories[i];
    const filteredByStory = corpus.filter(c => c[storyKey as keyof typeof c] === story);

    // Get the line items of each selected story
    const shuffleFilteredStory = _shuffle(filteredByStory);
    // Take the first two items of the shuffled story
    for (let i = 0; i < numItemsPerStory; i += 1) {
      shuffledStoryCorpus.push(shuffleFilteredStory[i]);
    }
  }

  const nonStoryItems = corpus.filter(c => typesToAvoid.indexOf(c[storyKey as keyof typeof c] as string) > -1);

  return [...nonStoryItems, ...shuffledStoryCorpus];
}