// age > 4 gives the 3x3 grid, so the fallback's switch to the 2x2 grid can be detected
const memory_game_url = 'http://localhost:8080/?task=memory-game&age=8';

// Heavy-instructions forward practice: the scripted (downex) sequence lengths in the corpus
const HEAVY_FORWARD_PRACTICE_LENGTHS = [1, 1, 2, 2];
// the guided backward row has no fixed length, so it uses the adaptive length: 3 here, since every answer is correct
const HEAVY_BACKWARD_PRACTICE_LENGTHS = [3, 2, 2];
// default (non-downex) forward practice rows in the corpus
const DEFAULT_FORWARD_PRACTICE_TRIALS = 2;
const FORWARD_TEST_TRIALS = 14;
const BACKWARD_TEST_TRIALS = 12;

const isForwardTest = (trial) => !trial.isPractice && !trial.reverse;
const isBackwardTest = (trial) => !trial.isPractice && trial.reverse;
const isForwardPractice = (trial) => trial.isPractice && !trial.reverse;
const isBackwardPractice = (trial) => trial.isPractice && trial.reverse;

describe('test memory game', () => {
  it('plays the default flow', () => {
    playMemoryGame(memory_game_url).then((trials) => {
      // all answers are correct, so no trial is skipped by the error limit
      expect(trials.filter(isForwardTest)).to.have.length(FORWARD_TEST_TRIALS);
      expect(trials.filter(isBackwardTest)).to.have.length(BACKWARD_TEST_TRIALS);
      expect(trials.every((trial) => trial.numOfBlocks === 9)).to.equal(true);
    });
  });

  it('plays the heavy-instructions flow', () => {
    playMemoryGame(`${memory_game_url}&heavyInstructions=true`).then((trials) => {
      expect(trials.filter(isForwardPractice).map((trial) => trial.length)).to.deep.equal(
        HEAVY_FORWARD_PRACTICE_LENGTHS,
      );
      expect(trials.filter(isBackwardPractice).map((trial) => trial.length)).to.deep.equal(
        HEAVY_BACKWARD_PRACTICE_LENGTHS,
      );
      expect(trials.filter(isForwardTest)).to.have.length(FORWARD_TEST_TRIALS);
      expect(trials.filter(isBackwardTest)).to.have.length(BACKWARD_TEST_TRIALS);
    });
  });

  it('falls back to heavy instructions after early mistakes', () => {
    // answer the first 2 forward test trials wrong, so the fallback check fires after the second
    const shouldAnswerWrong = (trial, trials) => isForwardTest(trial) && trials.filter(isForwardTest).length <= 2;

    playMemoryGame(memory_game_url, shouldAnswerWrong).then((trials) => {
      const forwardPractice = trials.filter(isForwardPractice);
      const defaultPractice = forwardPractice.slice(0, DEFAULT_FORWARD_PRACTICE_TRIALS);
      const replayedPractice = forwardPractice.slice(DEFAULT_FORWARD_PRACTICE_TRIALS);

      expect(defaultPractice.every((trial) => trial.numOfBlocks === 9)).to.equal(true);
      // the heavy forward practice is replayed on the 2x2 grid
      expect(replayedPractice.map((trial) => trial.length)).to.deep.equal(HEAVY_FORWARD_PRACTICE_LENGTHS);
      expect(replayedPractice.every((trial) => trial.numOfBlocks === 4)).to.equal(true);

      // 2 errors stay under the error limit, so every test trial still runs, the rest on the 2x2 grid
      const forwardTests = trials.filter(isForwardTest);
      expect(forwardTests).to.have.length(FORWARD_TEST_TRIALS);
      expect(forwardTests.slice(2).every((trial) => trial.numOfBlocks === 4)).to.equal(true);
      expect(trials.filter(isBackwardTest)).to.have.length(BACKWARD_TEST_TRIALS);
    });
  });
});

/**
 * Plays the task to the end screen and yields every input trial played, in order:
 * { correctAnswer, isPractice, reverse, numOfBlocks, length }.
 * shouldAnswerWrong(trial, trialsSoFar) decides which input trials get a wrong answer.
 */
function playMemoryGame(url, shouldAnswerWrong = () => false) {
  const trials = [];
  let lastInputTrialNumber = 0;

  cy.visit(url);

  // wait for OK button to appear
  cy.contains('OK', { timeout: 300000 }).should('be.visible');
  cy.contains('OK').realClick(); // start fullscreen

  function step() {
    cy.get('.jspsych-content', { timeout: 60000 }).then((content) => {
      if (content.text().includes('Thank you!')) {
        return;
      }

      const blocks = content.find('.jspsych-corsi-block');

      // instruction, feedback or other screen: wait for its continue button, or for the next trial
      if (blocks.length === 0) {
        cy.get('.jspsych-content button.primary:not([disabled]), .jspsych-corsi-block', { timeout: 60000 }).then(
          (elements) => {
            // the end screen can appear while waiting; leave its Exit button for the caller to click
            if (Cypress.$('.jspsych-content').text().includes('Thank you!')) {
              return;
            }
            if (elements.first().is('button')) {
              cy.wrap(elements.first()).click();
            }
            step();
          },
        );
        return;
      }

      cy.window().then((window) => {
        const data = window.cypressData;

        // display trial, or an input trial that was already answered: wait for the next input trial
        if (!data || data.inputTrialNumber <= lastInputTrialNumber) {
          cy.wait(300);
          step();
          return;
        }

        lastInputTrialNumber = data.inputTrialNumber;
        const trial = { ...data, length: data.correctAnswer.length };
        trials.push(trial);

        const answer = shouldAnswerWrong(trial, trials)
          ? [(data.correctAnswer[0] + 1) % data.numOfBlocks, ...data.correctAnswer.slice(1)]
          : data.correctAnswer;
        answer.forEach((blockIndex) => {
          blocks[blockIndex].click();
        });

        step();
      });
    });
  }

  step();

  cy.contains('Exit').click();

  return cy.wrap(trials);
}
