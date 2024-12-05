import _shuffle from 'lodash/shuffle';

export function shuffleStories(corpus: StimulusType[], inferenceNumStories: number | null, storyKey: string, typesToAvoid: string[], numItemsPerStory: number) {
  const shuffledStoryCorpus = [];
  const storyMap: Record<string, boolean> = {};
  corpus.forEach(c => {
    const storyName = c[storyKey as keyof typeof c] as string;
    if (!(storyName in storyMap) && !typesToAvoid.includes(storyName)) {
      storyMap[storyName] = true;
    }
  });
  const stories = Object.keys(storyMap);
  const shuffledStories = _shuffle(stories);
  for (let i = 0; i < (inferenceNumStories ?? 15); i += 1) {
    const story = shuffledStories[i];
    const filteredByStory = corpus.filter(c => c[storyKey as keyof typeof c] === story);

    // Filter literal and non-literal items
    const literalItems = filteredByStory.filter(c => c.trialType === 'literal');
    const nonLiteralItems = filteredByStory.filter(c => c.trialType !== 'literal');

    // Select items
    const selectedItems = [];
    if (literalItems.length > 0) {
      selectedItems.push(literalItems[0]); // Pick one literal item
    }

    const remainingItems = _shuffle(nonLiteralItems.concat(literalItems.slice(1))); // Shuffle the rest
    const additionalItemsNeeded = numItemsPerStory - selectedItems.length;

    selectedItems.push(...remainingItems.slice(0, additionalItemsNeeded));

    // Shuffle the selected items so the literal is not always first
    const finalSelection = _shuffle(selectedItems);

    // Add items to the shuffledStoryCorpus
    for (let j = 0; j < numItemsPerStory; j += 1) {
      if (finalSelection[j]) {
        shuffledStoryCorpus.push({
          ...finalSelection[j],
          itemId: `${finalSelection[j].itemId}_${j + 1}`, // Append index to itemId
        });
      }
    }
  }

  const nonStoryItems = corpus.filter(c => typesToAvoid.includes(c[storyKey as keyof typeof c] as string));

  return [...nonStoryItems, ...shuffledStoryCorpus];
}