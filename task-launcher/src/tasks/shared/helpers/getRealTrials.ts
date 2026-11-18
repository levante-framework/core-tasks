function subtractStoryBranchTrials(
  totalRealTrials: number,
  previousBlockStoryBranches: Record<string, number>,
): number {
  // total test trials represents highest possible number of trials, so subtract all trials from branches other than the longest one
  if (Object.keys(previousBlockStoryBranches).length > 1) {
    const longestStoryBranch = Object.keys(previousBlockStoryBranches)?.reduce((a: string, b: string) =>
      previousBlockStoryBranches[a] > previousBlockStoryBranches[b] ? a : b,
    );
    delete previousBlockStoryBranches[longestStoryBranch];

    const storyBranchSkipCount = Object.values(previousBlockStoryBranches)?.reduce((a: number, b: number) => a + b, 0);
    return totalRealTrials - storyBranchSkipCount;
  }

  return totalRealTrials;
}

export function getRealTrials(corpus: StimulusType[]) {
  const realTrials = corpus.filter((trial: StimulusType) => {
    return trial.assessmentStage === 'test_response';
  });

  let totalRealTrials = realTrials.length;

  // account for the fact that some trials with a story_branch are skipped because only one branch runs per block
  let thisBlockIndex: number | undefined;
  let previousBlockStoryBranches: Record<string, number> = {};
  realTrials.forEach((trial: StimulusType) => {
    const blockIndex = trial.block_index;
    if (blockIndex !== thisBlockIndex) {
      thisBlockIndex = blockIndex;
      totalRealTrials = subtractStoryBranchTrials(totalRealTrials, previousBlockStoryBranches);
      previousBlockStoryBranches = {};
    }

    const storyBranch = trial.storyBranch;
    if (storyBranch) {
      previousBlockStoryBranches[storyBranch] = (previousBlockStoryBranches[storyBranch] || 0) + 1;
    }
  });

  totalRealTrials = subtractStoryBranchTrials(totalRealTrials, previousBlockStoryBranches);

  return totalRealTrials;
}
