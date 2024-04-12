// This function randomizes stimulus blocks by thier trial type

export function shuffleStimulusTrials(trialArray) {
  // 1. Group stimulus trials by type
  const stimulusTrialsByType = {};
  for (const trial of trialArray) {
    if (trial.trialType !== 'instructions' && trial.notes !== 'practice') {
      const trialType = trial.trialType; // Example property
      if (!stimulusTrialsByType[trialType]) {
        stimulusTrialsByType[trialType] = [];
      }
      stimulusTrialsByType[trialType].push(trial);
    }
  }

  // 2. Shuffle each group of stimulus trials
  for (const trialType in stimulusTrialsByType) {
    const shuffledGroup = shuffleArray(stimulusTrialsByType[trialType]);
    stimulusTrialsByType[trialType] = shuffledGroup;
  }

  // 3. Reintegrate shuffled stimulus trials into original array
  let index = 0;
  for (const trial of trialArray) {
    if (trial.trialType !== 'instructions' && trial.notes !== 'practice') {
      const trialType = trial.trialType;
      trialArray[index] = stimulusTrialsByType[trialType].shift();
    }
    index++;
  }

  return trialArray;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
