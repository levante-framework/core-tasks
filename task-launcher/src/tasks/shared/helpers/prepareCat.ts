import _shuffle from 'lodash/shuffle';
// @ts-ignore
import { taskStore } from '../../../taskStore';
import { cat } from '../../taskSetup';

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
    (trial.trialType !== excludedTrialTypes) && 
    (taskStore().task == "egma-math" && trial.block_index == "0")
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
          console.log(cat.theta);
        }
      }
}