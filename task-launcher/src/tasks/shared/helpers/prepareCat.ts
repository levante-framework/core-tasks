import _shuffle from 'lodash/shuffle';
// @ts-ignore
import { taskStore } from '../../../taskStore';

// separates trials from corpus into blocks depending on for heavy/light instructions and CAT
export function prepareCorpus(corpus: StimulusType[]) {
  const excludedTrialTypes = '3D';
  const cat: boolean = taskStore().runCat;
  let corpora;

  const instructionPracticeTrials: StimulusType[] = corpus.filter(trial =>
    trial.trialType === 'instructions' || trial.assessmentStage === 'practice-response'
  );

  const heavyInstructionPracticeTrials: StimulusType[] = instructionPracticeTrials.filter(trial =>
    trial.difficulty < 0
  );

  const lightInstructionPracticeTrials: StimulusType[] = instructionPracticeTrials.filter(trial =>
    trial.difficulty > 0 || trial.difficulty == null || isNaN(trial.difficulty)
  );

  const corpusParts = {
    ipHeavy: heavyInstructionPracticeTrials,
    ipLight: lightInstructionPracticeTrials,
    test: corpus.filter(trial => !instructionPracticeTrials.includes(trial))
  }

  // separate out normed/unnormed trials
  const unnormedTrials: StimulusType[] = corpusParts.test.filter(trial =>
    trial.difficulty == null || isNaN(trial.difficulty)
  );
  const normedTrials: StimulusType[] = corpusParts.test.filter(trial =>
    !unnormedTrials.includes(trial)
  );

  // determine start items
  const possibleStartItems: StimulusType[] = normedTrials.filter(trial =>
    (trial.trialType !== excludedTrialTypes)
  )
  const startItems: StimulusType[] = selectNItems(possibleStartItems, 5);

  // put cat portion of corpus into taskStore 
  const catCorpus: StimulusType[] = normedTrials.filter(trial =>
    !startItems.includes(trial)
  )
  
  corpora = {
    ipHeavy: corpusParts.ipHeavy, // heavy instruction/practice trials
    ipLight: corpusParts.ipLight, // light instruction/practice  
    start: startItems, // 5 random items to be used in starting block (all under a certain max difficulty)
    unnormed: unnormedTrials, // all items without IRT parameters
    cat: catCorpus // all normed items for CAT
  }

  if (cat) {
    // if cat is running, put only normed trials into taskStore
    const newCorpora = {
      practice: taskStore().corpora.practice,
      stimulus: catCorpus
    }
    taskStore('corpora', newCorpora)
  } else {
    // if cat is not running, put entire test portion of corpus into taskStore but leave out instruction/practice
    const newCorpora = {
      practice: taskStore().corpora.practice,
      stimulus: corpusParts.test
    }
    taskStore("corpora", newCorpora);
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