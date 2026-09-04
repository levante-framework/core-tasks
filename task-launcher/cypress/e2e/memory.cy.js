import { getParamLists } from './helpers.cy.js';

const task = 'memory-game';
const base_url = `http://localhost:8080/?task=${task}`;
const testUrls = getParamLists(task).map((params) => `${base_url}&${params}`);
let taskCompleted, backwardPhase, forwardPhase;

describe('test memory game', () => {
  if (testUrls.length === 0) {
    it('fails when no test URLs are available (see cypress.config.js)', () => {
      expect(testUrls).to.have.length.greaterThan(0);
    });
    return;
  }

  testUrls.forEach((url) => {
    taskCompleted = false;
    backwardPhase = false;
    forwardPhase = false;

    const label = url.slice(base_url.length + 1) || 'default';

    it(`visits memory game and plays it (${label})`, () => {
      cy.visit(url);

      cy.get('.jspsych-content', { timeout: 300000 }).find('.primary').should('be.visible');
      cy.get('.jspsych-content').find('.primary').realClick();

      cy.get('p').then(() => {
        memoryLoop();
      });
    });
  });
});

function handleInstructions() {
  cy.get('.jspsych-content').then((content) => {
    const corsiBlocks = content.find('.jspsych-corsi-block');

    if (content.find('footer').length > 0) {
      taskCompleted = true;
    }

    if (corsiBlocks.length === 0 && !taskCompleted) {
      if (forwardPhase) {
        backwardPhase = true;
      }

      cy.get('.jspsych-content').find('.primary').click();
    }
  });
  return;
}

function answerTrial() {
  // wait for gap after display phase
  cy.get('p', { timeout: 20000 }).should('not.exist');
  cy.get('p').should('exist');

  cy.get('.jspsych-content').then((content) => {
    const blocks = content.find('.jspsych-corsi-block');

    if (blocks.length > 0) {
      if (!forwardPhase) {
        forwardPhase = true;
      }

      // wait for window to contain sequence information
      cy.window().its('cypressData').should('have.property', 'correctAnswer');

      cy.window().then((window) => {
        const sequence = window.cypressData.correctAnswer;
        if (backwardPhase) {
          sequence.reverse();
        }

        sequence.forEach((number) => {
          blocks[number].click();
        });
        cy.get('p').should('not.exist', { timeout: 5000 });
      });
    }
  });
  return;
}

function memoryLoop() {
  cy.get('.jspsych-content').then((content) => {
    const corsiBlocks = content.find('.jspsych-corsi-block');

    if (corsiBlocks.length > 0) {
      answerTrial();
    } else {
      handleInstructions();
    }
  });

  // end recursion if the task has reached the end screen
  if (!taskCompleted) {
    cy.get('p,h1').then((p) => {
      memoryLoop();
    });
  }

  return;
}
