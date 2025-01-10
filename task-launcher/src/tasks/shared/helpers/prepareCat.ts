import _shuffle from 'lodash/shuffle';
// @ts-ignore
import { taskStore } from '../../../taskStore';

// separates trials from corpus into blocks for cat
export function prepareCorpus(corpus: StimulusType[]) {
  const excludedTrialTypes = '3D'; 

  const instructionPracticeTrials: StimulusType[] = corpus.filter(trial => 
    trial.assessmentStage === 'instructions' || trial.assessmentStage === 'practice_response'
  );

  const possibleStartItems: StimulusType[] = corpus.filter(trial =>
    (trial.difficulty != null) &&
    !isNaN(Number(trial.difficulty)) &&
    !instructionPracticeTrials.includes(trial) &&
    (trial.trialType !== excludedTrialTypes)
  )
  
  const startItems: StimulusType[] = selectNItems(possibleStartItems, 5);
  
  const catCorpus: StimulusType[] = corpus.filter(trial => 
    !instructionPracticeTrials.includes(trial) && !startItems.includes(trial)
  );

  const unnormedTrials: StimulusType[] = catCorpus.filter((trial) => 
    trial.difficulty == null || isNaN(Number(trial.difficulty))
  );

  const normedCatCorpus: StimulusType[] = catCorpus.filter(trial => !unnormedTrials.includes(trial));

  // remove instruction, practice, and unnormed trials from corpus so that they don't run during CAT block
  const newCorpora = {
    practice: taskStore().corpora.practice,
    stimulus: normedCatCorpus
  }
  taskStore('corpora', newCorpora);

  const corpora = {
    instructionPractice: instructionPracticeTrials, // all instruction + practice trials
    start: startItems, // 5 random items to be used in starting block (all under a certain max difficulty)
    unnormed: unnormedTrials, // all items without IRT parameters
    cat: normedCatCorpus // all normed items for CAT
  }

  return corpora; 
}

export function selectNItems(corpus: StimulusType[], n: number) {
  const finalTrials: StimulusType[] = [];

  // randomize order of items 
  const shuffledTrials = _shuffle(corpus);

  // get the last n items
  for (let i = n; i > 0; i--) {
    const trial = shuffledTrials.pop();

    if (trial !== undefined) {
      finalTrials.push(trial); 
    }
  }

  return finalTrials; 
}