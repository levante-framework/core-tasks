import { getParamLists } from './helpers.cy.js';

const task = 'same-different-selection';
const base_url = `http://localhost:8080/?task=${task}`;
const testUrls = getParamLists(task).map((params) => `${base_url}&${params}`);

const nonWhiteBackgrounds = ['gray', 'black', 'striped'];
const stimulusContainer = '.lev-stimulus-container, .lev-stimulus-container-wide';

let previousSelections = []; // stores card pairs already matched in the current set
let currentCardSet = null; // dimension arrays for each card in the current trial set
let higherDimensionsPresent = false; // true when at least one card has a non-white background
let taskCompleted = false;

// used to find matching images
function checkOverlap(list1, list2) {
  return list1.filter((item) => list2.includes(item));
}

function isNewCardPair(card1, card2, selections) {
  return !selections.some(([a, b]) => (card1 === a && card2 === b) || (card1 === b && card2 === a));
}

function getCardDimensionsFromButtons(responseButtons) {
  return [...responseButtons].map((btn) => btn.alt.split('-')).sort((a, b) => a.join('-').localeCompare(b.join('-')));
}

function isSameCardSet(previousSet, nextSet) {
  if (!previousSet || !nextSet || previousSet.length !== nextSet.length) {
    return false;
  }

  return previousSet.every(
    (dimensions, index) =>
      dimensions.length === nextSet[index].length &&
      dimensions.every((value, dimIndex) => value === nextSet[index][dimIndex]),
  );
}

function cleanDimensions(dimensions) {
  if (higherDimensionsPresent) {
    dimensions.shift(); // ignore size dimension
  }

  if (dimensions.every((element) => Number.isNaN(Number(element))) && higherDimensionsPresent) {
    dimensions.push('1');
  }

  if (checkOverlap(dimensions, nonWhiteBackgrounds).length === 0 && higherDimensionsPresent) {
    dimensions.push('white');
  }

  return dimensions;
}

describe('test same different selection', () => {
  beforeEach(() => {
    previousSelections = [];
    currentCardSet = null;
    higherDimensionsPresent = false;
    taskCompleted = false;
  });

  if (testUrls.length === 0) {
    it('fails when no test URLs are available (see cypress.config.js)', () => {
      expect(testUrls).to.have.length.greaterThan(0);
    });
    return;
  }

  testUrls.forEach((url) => {
    const label = url.slice(base_url.length + 1) || 'default';

    it(`visits SDS and plays game (${label})`, () => {
      cy.visit(url);
      cy.get('.jspsych-content', { timeout: 600000 }).find('.primary').should('be.visible');
      cy.get('.jspsych-content').find('.primary').realClick();
      sdsLoop();
    });
  });
});

function hasActiveResponseButtons(content) {
  return (
    content.find('#jspsych-audio-multi-response-btngroup button.image-medium img').length > 0 ||
    content.find('#img-button-container button.image-medium:not(.no-pointer-events) img').length > 0 ||
    content.find('#jspsych-html-multi-response-btngroup button.image-medium img').length > 0 ||
    (content.find('.lev-stimulus-container-wide button.image-medium img').length > 1 &&
      content.find('button.primary').length === 0)
  );
}

function instructions() {
  cy.get('.jspsych-content').then((content) => {
    const okButton = content.find('.primary');

    if (okButton.length > 0) {
      // check for end of task
      cy.get(stimulusContainer).then((content) => {
        if (content.find('footer').length === 1) {
          cy.get('.primary').click({ timeout: 60000 });
          taskCompleted = true;
          return;
        } else {
          cy.get('.jspsych-content').find('.primary').click({ timeout: 60000 });
          return;
        }
      });
    } else {
      return;
    }
  });
}

function clickOkIfPresent() {
  cy.get('.jspsych-content').then((content) => {
    if (content.find('button.primary').length > 0) {
      cy.get('button.primary').should('not.be.disabled').click({ timeout: 60000 });
    }
  });
}

function handleTrial() {
  cy.get('.jspsych-content').then((content) => {
    if (hasActiveResponseButtons(content)) {
      singleAfc();
      multiAfc();
      clickOkIfPresent();
    } else {
      instructions();
    }
  });
}

function singleAfc() {
  cy.get('.jspsych-content').then((content) => {
    const correctAnswer = content.find('.correct');

    if (correctAnswer.length > 0) {
      cy.get('.correct').click();
      return;
    } else {
      return;
    }
  });
}

function multiAfc() {
  cy.get('.jspsych-content').then((content) => {
    const responseButtons = content.find('img');
    const correctAnswer = content.find('.correct'); // correct flag signals a single afc trial
    if (responseButtons.length === 0 || correctAnswer.length > 0) {
      return;
    }
    const cardSet = getCardDimensionsFromButtons(responseButtons);

    if (!isSameCardSet(currentCardSet, cardSet)) {
      // reset on new set of cards
      previousSelections = [];
      currentCardSet = cardSet;
      higherDimensionsPresent = cardSet.some((dimensions) => checkOverlap(dimensions, nonWhiteBackgrounds).length > 0);
    }

    responseButtons.each((i) => {
      let selected = false;
      const firstChoiceProperties = cleanDimensions(responseButtons[i].alt.split('-'));

      responseButtons.each((j) => {
        const properties = cleanDimensions(responseButtons[j].alt.split('-'));
        const matches = checkOverlap(properties, firstChoiceProperties);
        const card1 = responseButtons[i].alt;
        const card2 = responseButtons[j].alt;

        if (matches.length > 0 && j !== i && isNewCardPair(card1, card2, previousSelections)) {
          previousSelections.push([card1, card2]);
          responseButtons[i].click();
          responseButtons[j].click();
          selected = true;
          return false; // stops the each loop
        }
      });

      if (selected) {
        return false;
      }
    });
    return;
  });
}

function sdsLoop() {
  cy.get(stimulusContainer, { timeout: 60000 }).should('exist');

  handleTrial();

  cy.get(stimulusContainer)
    .should('not.exist')
    .then(() => {
      if (taskCompleted) {
        return;
      } else {
        sdsLoop();
      }
    });

  return;
}
