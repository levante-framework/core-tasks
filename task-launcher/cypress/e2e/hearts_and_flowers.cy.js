const PORT = Cypress.env('DEV_PORT') || 8080;
const hearts_and_flowers_url = `http://localhost:${PORT}/?task=hearts-and-flowers`;

// keep track of game phase (true means it has started)
var heart_phase = false;
var flower_phase = false;
var mixed_practice = false;
var final_instructions = false; // instructions before final mixed test phase
var mixed_test = false;
let lastProgressAt = Date.now();
let instructionClicks = 0;
let answersClicked = 0;
const markProgress = (label) => {
  cy.task('progress', label);
  cy.log(`[progress] ${label}`);
  lastProgressAt = Date.now();
};

describe('test hearts and flowers', () => {
  it('visits hearts and flowers and plays game', () => {
    cy.visit(hearts_and_flowers_url);

    // Verify ALL audio assets exist via HEAD requests (no body fetch)
    cy.window().its('__mediaAssets.audio').then((audioMap) => {
      if (!audioMap) return;
      const urls = Object.values(audioMap);
      const total = urls.length;
      cy.log(`[audio-head] starting HEAD checks for ${total} audio files`);
      cy.wrap(urls).each((url, index) => {
        cy.request({ url, method: 'HEAD', retryOnStatusCodeFailure: true }).then((resp) => {
          expect(resp.status, `HEAD ${url}`).to.be.oneOf([200, 204]);
          const ct = resp.headers['content-type'] || '';
          expect(ct.includes('audio') || ct === 'application/octet-stream', `content-type for ${url}`).to.be.true;
          const processed = index + 1;
          if (processed % 100 === 0 || processed === total) {
            const msg = `[audio-head] checked ${processed}/${total}`;
            cy.task('progress', msg);
            cy.log(msg);
            lastProgressAt = Date.now();
          }
        });
      });
    });

    // wait for primary button to appear and click to advance
    cy.get('.primary', { timeout: 300000 }).should('be.visible').click({ force: true });
    markProgress('clicked primary');

    hafLoop();
  });
});

function hafLoop() {
  // end if the there are no elements inside jspsych content
  cy.then(() => {
    const idle = Date.now() - lastProgressAt;
    expect(idle, 'no app progress idle time (ms)').to.be.lessThan(30000);
  });
  cy.get('.jspsych-content').then((content) => {
    if (content.children().length) {
      const okButton = content.find('.primary');
      // Make the decision here to handle instructions or pick an answer
      if (okButton.length) {
        handleInstructions();
      } else {
        pickAnswer();
      }
      cy.wait(100); // speed up between steps
      hafLoop();
    } else {
      // make sure that the game has progressed through major phases before passing
      assert.isTrue(heart_phase && flower_phase && mixed_test);
    }
  });
}

function handleInstructions() {
  cy.get('.jspsych-content').then((content) => {
    const okButton = content.find('.primary');

    if (okButton.length) {
      // capture current screen text to detect change after click
      const prevText = content.text().trim();
      cy.get('.primary').should('be.visible').click({ force: true });
      markProgress('advance instructions');
      instructionClicks += 1;
      if (instructionClicks % 20 === 0) {
        cy.task('progress', `[instructions] clicked ${instructionClicks}`);
        // log a small sample of the current instruction text for diagnostics
        const sample = prevText.slice(0, 120).replace(/\s+/g, ' ');
        cy.task('progress', `[instructions] prevText sample: ${sample}...`);
      }
      expect(instructionClicks, 'too many instruction clicks').to.be.lessThan(400);

      final_instructions = mixed_practice;

      // wait for either stimulus to appear or the instruction content to change
      cy.get('body').then(($body) => {
        const hasStimNow = $body.find('.haf-stimulus-container').length > 0;
        if (!hasStimNow) {
          cy.get('.jspsych-content', { timeout: 15000 }).should(($el) => {
            const newText = $el.text().trim();
            expect(newText, 'instruction screen did not change after click').to.not.eq(prevText);
          });
        }
      });
    }
  });

  return;
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
        // wait for choice buttons to be present/visible, then click the correct one
        const idx = getCorrectButtonIdx(src, pos);
        cy.get('.jspsych-content .secondary--green', { timeout: 15000 })
          .should(($btns) => {
            expect($btns.length, 'expected at least 2 choice buttons').to.be.gte(2);
          })
          .eq(idx)
          .should('be.visible')
          .click({ force: true });
        markProgress('answered');
        answersClicked += 1;
        if (answersClicked % 20 === 0) {
          cy.task('progress', `[answers] clicked ${answersClicked}`);
        }
        // after answering, wait for one of: correct feedback, fixation, or new stimulus image
        // Do not wait on specific DOM transitions; continue the loop quickly
        cy.wait(50);
      });
    }
  });

  return;
}

// uses image src and image position to get the right button index
function getCorrectButtonIdx(src, pos) {
  const shape = src.split('/').pop();

  if (shape === 'heart.png') {
    heart_phase = true;
    mixed_practice = flower_phase;
    mixed_test = final_instructions;

    return pos;
  } else if (shape === 'flower.png') {
    flower_phase = true;

    if (pos === 1) {
      return 0;
    } else if (pos === 0) {
      return 1;
    }
  }
}
