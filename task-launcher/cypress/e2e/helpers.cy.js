let taskCompleted = false;
const logMath = (msg) => {
  try {
    cy.task('progress', `[math] ${msg}`);
  } catch (e) {}
  cy.log(`[math] ${msg}`);
};
// recursively completes an instruction block
export function instructions() {
  return cy.get('.jspsych-content').then((content) => {
    const okButton = content.find('.primary');

    if (okButton.length > 0) {
      // check for end of task
      return cy.get('.lev-stimulus-container').then((wrap) => {
        if (wrap.find('footer').length === 1) {
          logMath('click Exit');
          return cy.contains('Exit').click({ timeout: 60000 }).then(() => {
            taskCompleted = true;
          });
        } else {
          logMath('advance instruction');
          return cy
            .get('.primary')
            .should('be.visible')
            .and('not.be.disabled')
            .click({ timeout: 60000 })
            .then(() => cy.wait(50))
            .then(() => instructions());
        }
      });
    }
    return undefined;
  });
}

// clicks correct answers
function selectAnswers(correctFlag, buttonClass) {
  cy.get('.jspsych-content').then((content) => {
    const hasSlider = content.find('.jspsych-slider').length > 0;
    const responseButtons = content.find(buttonClass);

    // If in slider phase without response buttons, skip
    if (hasSlider && responseButtons.length === 0) {
      logMath('slider phase (no response buttons)');
      return;
    }

    // Wait for the button group to exist, then DOM-scan and only click if something is present
    cy.get('#jspsych-html-multi-response-btngroup', { timeout: 60000 }).then(() => {
      cy.document().then((doc) => {
        const explicit = doc.querySelector('[aria-label="correct"], .correct');
        const secondary = doc.querySelector('.secondary');
        const target = secondary || explicit; // prefer secondary for stability
        if (!target) {
          logMath('no answer buttons present; skipping');
          return;
        }
        logMath(`click answer (dom-scan)`);
        cy.wrap(target).click({ force: true });
      }).then(() => cy.wait(150));
    });
  });
}

function handleMathSlider() {
  cy.get('.jspsych-content').then((content) => {
    const slider = content.find('.jspsych-slider');
    const responseButtons = content.find('.secondary'); // should be length zero if in the movable slider phase

    if (slider.length && !responseButtons.length) {
      cy.get('.jspsych-slider').realClick();

      cy.get('.primary').then((continueButton) => {
        continueButton.click();
      });
    }
  });

  return;
}

function taskLoop(correctFlag, buttonClass) {
  return cy
    .get('body')
    .then(($body) => {
      if (taskCompleted) return;

      const hasPrimary = $body.find('.primary:visible').length > 0;
      const hasStim = $body.find('.lev-stimulus-container').length > 0;
      const hasSlider = $body.find('.jspsych-slider').length > 0;

      if (hasPrimary) {
        logMath('click primary');
        cy.get('.primary').should('be.visible').click({ force: true });
        return instructions();
      }

      if (hasStim) {
        logMath(`stimulus present${hasSlider ? ' (slider)' : ''}`);
        if (hasSlider) {
          handleMathSlider();
        }
        selectAnswers(correctFlag, buttonClass);
      }
      return undefined;
    })
    .then(() => {
      if (taskCompleted) return;
      return cy.wait(100).then(() => taskLoop(correctFlag, buttonClass));
    });
}

export function testAfc(correctFlag, buttonClass) {
  // wait for OK button to be visible
  cy.get('.primary', { timeout: 300000 }).should('be.visible').click({ force: true });
  taskLoop(correctFlag, buttonClass);
}
