import _shuffle from 'lodash/shuffle';
// @ts-ignore
import { taskStore } from '../../../taskStore';

// separates trials from corpus into blocks for cat
export function prepareCorpus(corpus: StimulusType[]) {
  const instructionPracticeTrials: StimulusType[] = corpus.filter(trial => 
    trial.assessmentStage === 'instructions' || trial.assessmentStage === 'practice_response'
  );
  const catCorpus: StimulusType[] = corpus.filter(trial => !instructionPracticeTrials.includes(trial));
  const unnormedTrials: StimulusType[] = catCorpus.filter((trial) => 
    trial.difficulty == undefined || isNaN(trial.difficulty)
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