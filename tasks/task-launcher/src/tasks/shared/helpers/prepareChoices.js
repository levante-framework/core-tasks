export const prepareChoices = (target, distractors) => {
    // randomly select a location for the correct answer
    const randIndex = Math.floor(Math.random() * distractors.length + 1);
  
    // randomize the order of the distractors
    const stimulus = shuffle(distractors);
    let choices = [];
    for (let i = 0; i < distractors.length; i++) {
      choices.push(stimulus[i]);
    }
  
    // insert the target
    choices.splice(randIndex, 0, target);
  
    store.session.set("target", target);
    store.session.set("correctResponseIndx", randIndex);
    store.session.set("choices", choices);
  
    return {
      target: target,
      choices: choices,
      correctResponseIndx: randIndex,
    };
  };