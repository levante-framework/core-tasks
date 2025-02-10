import _shuffle from 'lodash/shuffle';
import { taskStore } from '../../../taskStore';
import { cat } from '../../taskSetup';

// separates trials from corpus into blocks depending on for heavy/light instructions and CAT
export function prepareCorpus(corpus: StimulusType[]) {
  const excludedTrialTypes = '3D';
  const cat: boolean = taskStore().runCat;
  let corpora;

  const instructionPracticeTrials: StimulusType[] = corpus.filter(trial =>
    trial.trialType === 'instructions' || trial.assessmentStage === 'practice_response'
  );

  const heavyInstructionPracticeTrials: StimulusType[] = instructionPracticeTrials.filter(trial =>
    Number(trial.difficulty) < 0
  );

  const lightInstructionPracticeTrials: StimulusType[] = instructionPracticeTrials.filter(trial =>
    Number(trial.difficulty) > 0 || trial.difficulty == null || isNaN(Number(trial.difficulty))
  );

  const corpusParts = {
    ipHeavy: heavyInstructionPracticeTrials,
    ipLight: lightInstructionPracticeTrials,
    test: corpus.filter(trial => !instructionPracticeTrials.includes(trial))
  }

  // separate out normed/unnormed trials
  const unnormedTrials: StimulusType[] = corpusParts.test.filter(trial =>
    trial.difficulty == null || isNaN(Number(trial.difficulty))
  );
  const normedTrials: StimulusType[] = corpusParts.test.filter(trial =>
    !unnormedTrials.includes(trial)
  );

  // determine start items
  const possibleStartItems: StimulusType[] = normedTrials.filter(trial =>
    (trial.trialType !== excludedTrialTypes) && 
    (taskStore().task == "egma-math" && trial.block_index == "0")
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

// separates cat corpus into blocks
export function prepareMultiBlockCat(corpus: StimulusType[]) {
  const blockList: StimulusType[][] = []; // a list of blocks, each containing trials

  corpus.forEach((trial: StimulusType) => {
    const block: number = Number(trial.block_index);

    if (block != undefined) {
      if (block >= blockList.length) {
        blockList.push([trial]);
      } else {
        blockList[block].push(trial);
      }
    }
  });

  return blockList; 
}

export function updateTheta(item: StimulusType, correct: boolean) {
  const runCat = taskStore().runCat; 
  if (runCat) {
    // update theta for CAT
      const zeta = {
        a: 1, // item discrimination (default value of 1)
        b: item.difficulty, // item difficulty (from corpus)
        c: item.chanceLevel, // probability of correct answer from guessing
        d: 1 // max probability of correct response (default 1)
      }; 
      
      if (!(Number.isNaN(zeta.b)) && (item.assessmentStage !== 'practice_response')) {
        const answer = correct ? 1 : 0;
        cat.updateAbilityEstimate(zeta, answer); 
      }
  }
}