const hearts_and_flowers_url = 'http://localhost:8080/?task=hearts-and-flowers';

// Feedback prompts in the corpus (English)
const CORRECT_FEEDBACK = 'Good job!';
const INCORRECT_FEEDBACK = {
  instructionPractice: "That's not quite right. Please try again.",
  heart: 'Remember! When you see a HEART, press the button on the SAME side.',
  flower: 'When you see a FLOWER, press the button on the OTHER side.',
};
// Instruction practice presses per phase, all answered right
const INSTRUCTION_PRACTICE_TRIALS = 6;
// Practice ends after this many right answers in a row: hearts, flowers, mixed
const PRACTICE_WIN_STREAKS = [2, 2, 3];
// Answered stimuli to answer wrong in the wrong-answer test (1-based): the first hearts instruction practice,
// the first hearts practice trial, and the first mixed practice trial (counted with every other answer right)
const WRONG_ANSWERS = [1, 4, 41];

// keep track of game phase (true means it has started)
let heart_phase = false;
let flower_phase = false;
let mixed_practice = false;
let final_instructions = false; // instructions before final mixed test phase
let mixed_test = false;
// number of stimuli answered so far, and which of them to answer wrong
let answer_count = 0;
let wrong_answers = [];

describe('test hearts and flowers', () => {
  beforeEach(() => {
    heart_phase = false;
    flower_phase = false;
    mixed_practice = false;
    final_instructions = false;
    mixed_test = false;
    answer_count = 0;
    wrong_answers = [];
  });

  it('visits hearts and flowers and plays game', () => {
    playHeartsAndFlowers();

    // every practice answer is right: correct feedback after each instruction practice and practice trial
    getFeedbackScreens().then((screens) => {
      const expectedCount = INSTRUCTION_PRACTICE_TRIALS + PRACTICE_WIN_STREAKS.reduce((a, b) => a + b, 0);
      expect(screens).to.have.length(expectedCount);
      expect(screens.every((screen) => screen.kind === 'correct' && screen.text === CORRECT_FEEDBACK)).to.equal(true);
    });
  });

  it('shows the incorrect feedback for the stimulus after a wrong practice answer', () => {
    wrong_answers = WRONG_ANSWERS;
    playHeartsAndFlowers();

    getFeedbackScreens().then((screens) => {
      const incorrect = screens.filter((screen) => screen.kind === 'incorrect');
      expect(incorrect.map((screen) => screen.text)).to.deep.equal([
        INCORRECT_FEEDBACK.instructionPractice,
        INCORRECT_FEEDBACK.heart,
        // the mixed practice prompt depends on the stimulus shown
        INCORRECT_FEEDBACK[incorrect[2]?.stimulus],
      ]);
      expect(incorrect[1].stimulus).to.equal('heart');
      expect(screens.filter((screen) => screen.kind === 'correct').every((s) => s.text === CORRECT_FEEDBACK)).to.equal(
        true,
      );
    });
  });
});

function playHeartsAndFlowers() {
  cy.visit(hearts_and_flowers_url, { onBeforeLoad: recordFeedbackScreens });

  cy.contains('OK', { timeout: 300000 }).should('be.visible');
  cy.contains('OK').realClick(); // start fullscreen

  hafLoop();
}

/**
 * Records each feedback screen the task shows as { kind, text, stimulus }: correct feedback is the smiling face,
 * incorrect feedback shows the stimulus again with both buttons disabled.
 */
function recordFeedbackScreens(win) {
  win.feedbackScreens = [];
  const recorded = new WeakSet();
  new win.MutationObserver(() => {
    const content = win.document.querySelector('.jspsych-content');
    const correct = content?.querySelector('.haf-cr-container');
    if (correct && !recorded.has(correct)) {
      recorded.add(correct);
      win.feedbackScreens.push({ kind: 'correct', text: correct.querySelector('p')?.textContent.trim() });
    }
    const holder = content?.querySelector('.haf-stimulus-holder');
    if (holder && !recorded.has(holder) && isIncorrectFeedbackScreen(Cypress.$(content))) {
      recorded.add(holder);
      win.feedbackScreens.push({
        kind: 'incorrect',
        text: holder.querySelector('.lev-row-container p')?.textContent.trim(),
        stimulus: getStimulusShape(holder.querySelector('[alt="heart or flower"]')?.getAttribute('src') ?? ''),
      });
    }
  }).observe(win.document, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
}

function getFeedbackScreens() {
  return cy.window().then((win) => win.feedbackScreens);
}

// incorrect feedback shows the stimulus with both response buttons disabled
function isIncorrectFeedbackScreen(content) {
  const buttons = content.find('.haf-stimulus-holder').length ? content.find('.secondary--green') : [];
  return buttons.length === 2 && [...buttons].every((button) => button.disabled);
}

function hafLoop() {
  // end if the there are no elements inside jspsych content
  cy.get('.jspsych-content').then((content) => {
    if (content.children().length) {
      // wait for feedback screens to go away
      cy.get('.haf-cr-container').should('not.exist');
      cy.get('.jspsych-content').should((current) => {
        expect(isIncorrectFeedbackScreen(current)).to.equal(false);
      });

      // Make the decision here to handle instructions or pick an answer
      if (isInstructionScreen(content)) {
        handleInstructions();
      } else {
        pickAnswer();
      }
      hafLoop();
    } else {
      // make sure that the game has progressed through major phases before passing
      assert.isTrue(heart_phase && flower_phase && mixed_test);
    }
  });
}

function isInstructionScreen(content) {
  if (content.find('.primary:visible').length) {
    return true;
  }

  return content.find('#instruction-text').length > 0 && !content.find('.haf-stimulus-holder').length;
}

function handleInstructions() {
  cy.get('.jspsych-content').then((content) => {
    const okButton = content.find('.primary:visible');

    if (okButton.length) {
      cy.contains('OK').realClick();
      final_instructions = mixed_practice;
      return;
    }

    if (content.find('#instruction-text').length && content.find('.lev-response-row').length) {
      handleResponseButtonDemo();
      return;
    }

    continueInstruction();
    final_instructions = mixed_practice;
  });

  return;
}

function handleResponseButtonDemo() {
  cy.get('.lev-response-row .secondary--green', { timeout: 120000 })
    .filter(':not([style*="visibility: hidden"])')
    .first()
    .should(($button) => {
      expect($button[0].style.animation).to.include('pulse');
    })
    .then(($button) => {
      cy.get('.lev-response-row .secondary--green').then(($buttons) => {
        const visibleIndex = [...$buttons].findIndex(
          (button) => button.style.visibility !== 'hidden' && !button.disabled,
        );

        cy.get('body').then(($body) => {
          if ($body.find('.arrow-key-border').length) {
            cy.realPress(visibleIndex === 0 ? 'ArrowLeft' : 'ArrowRight');
          } else {
            cy.wrap($button).realClick();
          }
        });
      });
    });

  // instruction demo trials wait before advancing
  cy.wait(2500);
}

function continueInstruction(retryCount = 0) {
  if (retryCount > 30) {
    throw new Error('Failed to advance instruction trial');
  }

  cy.get('.jspsych-content').then(($content) => {
    if (!$content.find('#instruction-text').length) {
      return;
    }

    const instructionText = $content.find('#instruction-text').text();

    cy.wait(3000);
    cy.realPress(' ');
    cy.wait(1000);

    cy.get('.jspsych-content').then(($nextContent) => {
      const stillOnSameTrial =
        $nextContent.find('#instruction-text').length &&
        $nextContent.find('#instruction-text').text() === instructionText &&
        !$nextContent.find('.haf-stimulus-holder').length;

      if (stillOnSameTrial) {
        continueInstruction(retryCount + 1);
      }
    });
  });
}

function pickAnswer() {
  // wait for feedback screen to end
  cy.get('.haf-stimulus-holder').should('exist');

  cy.get('.jspsych-content').then((content) => {
    const stimContainer = content.find('.haf-stimulus-container');

    if (stimContainer.length) {
      // check for presence of stimulus on left side
      const leftStim = stimContainer.find('.stimulus-left');

      // get position of stimulus based on whether leftStim exists
      const pos = leftStim.length ? 0 : 1;

      // get stimulus image itself and then click button based on src and pos
      const stim = cy.get('[alt="heart or flower"]');
      stim.invoke('attr', 'src').then((src) => {
        // press the correct arrow key, or the other one for a wrong answer
        answer_count += 1;
        const correctIndex = getCorrectButtonIdx(src, pos);
        const index = wrong_answers.includes(answer_count) ? 1 - correctIndex : correctIndex;
        cy.realPress(index === 0 ? 'ArrowLeft' : 'ArrowRight');
      });
    }
  });

  return;
}

function getStimulusShape(src) {
  return src.split('/').pop().split('.')[0];
}

// uses image src and image position to get the right button index
function getCorrectButtonIdx(src, pos) {
  const shape = getStimulusShape(src);

  if (shape === 'heart') {
    heart_phase = true;
    mixed_practice = flower_phase;
    mixed_test = final_instructions;

    return pos;
  } else if (shape === 'flower') {
    flower_phase = true;

    if (pos === 1) {
      return 0;
    } else if (pos === 0) {
      return 1;
    }
  }
}
