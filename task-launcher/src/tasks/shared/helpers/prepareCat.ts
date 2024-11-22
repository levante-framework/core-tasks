// @ts-ignore
import { taskStore } from './taskStore.js';

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