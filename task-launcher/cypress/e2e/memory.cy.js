// age > 4 gives the 3x3 grid, so the fallback's switch to the 2x2 grid can be detected
const memory_game_url = 'http://localhost:8080/?task=memory-game&age=8';

// Heavy-instructions forward practice: the scripted (downex) sequence lengths in the corpus
const HEAVY_FORWARD_PRACTICE_LENGTHS = [1, 1, 1, 2, 2, 2];
// the guided backward row has no fixed length, so it uses the adaptive length: 3 here, since every answer is correct
const HEAVY_BACKWARD_PRACTICE_LENGTHS = [3, 2, 2];
// default (non-downex) forward practice rows in the corpus
const DEFAULT_FORWARD_PRACTICE_TRIALS = 3;
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
      // each practice trial gets the correct feedback row's screen; test trials get none
      expect(trials.filter((trial) => trial.isPractice).every((trial) => trial.feedback === 'correct')).to.equal(true);
      expect(trials.filter((trial) => !trial.isPractice).every((trial) => !trial.feedback)).to.equal(true);
    });
  });

  it('shows incorrect feedback after a wrong default practice answer, and repeats the practice', () => {
    const isLastForwardPractice = (trial, trials) =>
      isForwardPractice(trial) && trials.filter(isForwardPractice).length === DEFAULT_FORWARD_PRACTICE_TRIALS;

    playMemoryGame(memory_game_url, isLastForwardPractice).then((trials) => {
      const forwardPractice = trials.filter(isForwardPractice);
      // the wrong last answer plays the forward practice rows once more
      expect(forwardPractice).to.have.length(DEFAULT_FORWARD_PRACTICE_TRIALS * 2);
      expect(forwardPractice[DEFAULT_FORWARD_PRACTICE_TRIALS - 1].feedback).to.equal('incorrect');
      expect(
        forwardPractice.slice(DEFAULT_FORWARD_PRACTICE_TRIALS).every((trial) => trial.feedback === 'correct'),
      ).to.equal(true);
      expect(trials.filter(isForwardTest)).to.have.length(FORWARD_TEST_TRIALS);
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
      // guided rows link only correct feedback, so every practice trial gets the correct screen
      expect(trials.filter((trial) => trial.isPractice).every((trial) => trial.feedback === 'correct')).to.equal(true);
    });
  });

  it('retries a wrong heavy practice answer instead of showing incorrect feedback', () => {
    // the second forward practice row is a non-guided length-1 sequence
    const isSecondForwardPractice = (trial, trials) =>
      isForwardPractice(trial) && trials.filter(isForwardPractice).length === 2;

    playMemoryGame(`${memory_game_url}&heavyInstructions=true`, isSecondForwardPractice).then((trials) => {
      const forwardPractice = trials.filter(isForwardPractice);
      // the retry is one extra input trial of the same length, with no feedback screen around it
      expect(forwardPractice.map((trial) => trial.length)).to.deep.equal([1, 1, 1, 1, 2, 2, 2]);
      expect(forwardPractice[1].feedback).to.equal(undefined);
      expect(forwardPractice[2].feedback).to.equal(undefined);
      expect(trials.every((trial) => trial.feedback !== 'incorrect')).to.equal(true);
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
 * { correctAnswer, isPractice, reverse, numOfBlocks, length, feedback }.
 * feedback is 'correct' or 'incorrect' when a feedback screen follows the trial, by its face image.
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
              const feedbackImage = Cypress.$('.jspsych-content img').attr('src') ?? '';
              const lastTrial = trials[trials.length - 1];
              if (lastTrial && /smil/i.test(feedbackImage)) lastTrial.feedback = 'correct';
              if (lastTrial && /sad/i.test(feedbackImage)) lastTrial.feedback = 'incorrect';
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
