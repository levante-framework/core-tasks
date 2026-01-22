#!/bin/bash

echo "🔧 UPDATING ALL TASK TESTS WITH ENHANCED ANTI-LOOP LOGIC"
echo "========================================================"

# List of all tasks
TASKS=(
    "egma-math"
    "matrix-reasoning"
    "mental-rotation"
    "hearts-and-flowers"
    "memory-game"
    "same-different-selection"
    "trog"
    "vocab"
    "theory-of-mind"
    "intro"
    "roar-inference"
    "adult-reasoning"
)

# Enhanced interaction template
create_enhanced_test() {
    local task_name=$1
    local task_kebab=$2
    
    cat > "cypress/e2e/${task_kebab}_enhanced.cy.js" << 'EOL'
describe('TASK_NAME Enhanced - Anti-Loop Logic', () => {
  it('should capture screenshots with intelligent progression', () => {
    let lastScreenState = '';
    let stateRepeatCount = 0;
    let interactionStrategy = 0;
    let visitedStates = new Set();
    
    // Visit the task
    cy.visit('http://localhost:8080?task=TASK_KEBAB');
    
    // Mock fullscreen API
    cy.window().then((win) => {
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement
      });
      Object.defineProperty(win.document, 'fullscreenEnabled', {
        get: () => true
      });
      win.screen.orientation = {
        lock: cy.stub().resolves()
      };
    });
    
    // Take initial screenshot
    cy.screenshot('00-start');
    
    // Enhanced interaction with loop detection (30 steps = 2.5 minutes)
    for (let i = 1; i <= 30; i++) {
      cy.wait(5000); // 5 second intervals
      
      // Capture current screen state for loop detection
      cy.get('body').then(($body) => {
        // Create a more sophisticated state identifier
        const visibleText = $body.find(':visible').text().replace(/\s+/g, ' ').trim();
        const buttonCount = $body.find('button:visible').length;
        const inputCount = $body.find('input:visible').length;
        const currentScreenState = `${visibleText.substring(0, 150)}_BTN:${buttonCount}_INP:${inputCount}`;
        
        // Detect if we're stuck in the same state
        if (currentScreenState === lastScreenState) {
          stateRepeatCount++;
          console.log(`🔄 Same state detected ${stateRepeatCount} times: ${currentScreenState.substring(0, 50)}...`);
        } else {
          // New state detected
          if (visitedStates.has(currentScreenState)) {
            console.log(`🔁 Revisiting known state: ${currentScreenState.substring(0, 50)}...`);
            stateRepeatCount = 1; // Start counting repeats
          } else {
            console.log(`✨ New state discovered: ${currentScreenState.substring(0, 50)}...`);
            visitedStates.add(currentScreenState);
            stateRepeatCount = 0;
            interactionStrategy = 0; // Reset strategy for new states
          }
        }
        lastScreenState = currentScreenState;
        
        // Escalate strategy if stuck
        if (stateRepeatCount >= 2) {
          interactionStrategy = Math.min(interactionStrategy + 1, 5);
          console.log(`🚨 Escalating to strategy ${interactionStrategy} (stuck ${stateRepeatCount} times)`);
        }
        
        // Progressive interaction strategies
        performEnhancedInteraction($body, interactionStrategy, i);
      });
      
      // Take screenshot
      cy.screenshot(`${i.toString().padStart(2, '0')}-step-${i}`);
    }
    
    // Final screenshot
    cy.screenshot('99-final');
    
    function performEnhancedInteraction($body, strategy, step) {
      console.log(`🎯 Step ${step}: Using interaction strategy ${strategy}`);
      
      switch(strategy) {
        case 0: // Normal progression
          normalInteraction($body);
          break;
        case 1: // More thorough exploration
          thoroughInteraction($body);
          break;
        case 2: // Alternative elements
          alternativeInteraction($body);
          break;
        case 3: // Keyboard navigation
          keyboardInteraction($body);
          break;
        case 4: // Random exploration
          randomInteraction($body);
          break;
        case 5: // Force progression
          forceProgressionInteraction($body);
          break;
        default:
          normalInteraction($body);
      }
    }
    
    function normalInteraction($body) {
      // Priority 1: Navigation and progression buttons
      const navButtons = $body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin"), button:contains("Submit"), button:contains("Done"), button:contains("Proceed")');
      if (navButtons.length > 0) {
        console.log('📍 Clicking navigation button');
        cy.wrap(navButtons.first()).click();
        cy.wait(1000);
        return;
      }
      
      // Priority 2: Task-specific interactions
      handleTaskSpecificInteractions($body);
    }
    
    function thoroughInteraction($body) {
      console.log('🔍 Thorough exploration mode');
      
      // Try multiple navigation buttons
      const allNavButtons = $body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin"), button:contains("Submit"), button:contains("Done"), button:contains("Try"), button:contains("Go")');
      if (allNavButtons.length > 0) {
        allNavButtons.each((index, btn) => {
          if (index < 2) { // Try first 2 buttons
            cy.wrap(btn).click();
            cy.wait(500);
          }
        });
        return;
      }
      
      handleTaskSpecificInteractions($body);
      
      // Try any enabled button
      const enabledButtons = $body.find('button:not([disabled]):visible');
      if (enabledButtons.length > 0) {
        cy.wrap(enabledButtons.first()).click();
        cy.wait(500);
      }
    }
    
    function alternativeInteraction($body) {
      console.log('🔀 Alternative interaction mode');
      
      // Look for different types of interactive elements
      const selectors = [
        '[data-testid]',
        '[data-cy]',
        'div[onclick]',
        'span[onclick]',
        '.clickable',
        '.interactive',
        '[role="button"]',
        'a[href]:visible',
        'img[onclick]',
        '[tabindex]:visible'
      ];
      
      for (const selector of selectors) {
        const elements = $body.find(selector);
        if (elements.length > 0) {
          console.log(`🎯 Clicking ${selector}`);
          cy.wrap(elements.first()).click();
          cy.wait(500);
          break;
        }
      }
      
      handleTaskSpecificInteractions($body);
    }
    
    function keyboardInteraction($body) {
      console.log('⌨️ Keyboard interaction mode');
      
      // Try various keyboard inputs
      const keys = ['{enter}', '{space}', '{tab}', '{rightarrow}', '{leftarrow}', '{downarrow}', '{uparrow}'];
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      
      cy.get('body').type(randomKey);
      cy.wait(500);
      
      // For math/number tasks, try number keys
      if ('TASK_KEBAB'.includes('math') || 'TASK_KEBAB'.includes('reasoning')) {
        const numberKey = Math.floor(Math.random() * 10).toString();
        cy.get('body').type(numberKey);
        cy.wait(500);
      }
    }
    
    function randomInteraction($body) {
      console.log('🎲 Random exploration mode');
      
      // Get all potentially interactive elements
      const allInteractive = $body.find('button:visible, input:visible, select:visible, [onclick]:visible, [data-choice]:visible, .choice:visible, .option:visible');
      
      if (allInteractive.length > 0) {
        const randomElement = allInteractive.eq(Math.floor(Math.random() * allInteractive.length));
        console.log(`🎲 Random click on: ${randomElement.prop('tagName')}`);
        cy.wrap(randomElement).click();
        cy.wait(1000);
      } else {
        // Click in different areas of the screen
        const positions = [[200, 200], [400, 300], [600, 400], [300, 500]];
        const randomPos = positions[Math.floor(Math.random() * positions.length)];
        cy.get('body').click(randomPos[0], randomPos[1]);
        cy.wait(500);
      }
    }
    
    function forceProgressionInteraction($body) {
      console.log('🚀 Force progression mode');
      
      // Try clicking anywhere there might be hidden buttons
      cy.get('body').click('center');
      cy.wait(500);
      
      // Try all buttons regardless of visibility
      const allButtons = $body.find('button');
      if (allButtons.length > 0) {
        allButtons.each((index, btn) => {
          if (index < 3) {
            cy.wrap(btn).click({ force: true });
            cy.wait(300);
          }
        });
      }
      
      // Try keyboard shortcuts that might advance the game
      cy.get('body').type('{enter}');
      cy.wait(500);
      cy.get('body').type(' '); // Spacebar
      cy.wait(500);
    }
    
    function handleTaskSpecificInteractions($body) {
      // Task-specific interaction logic
      
      // Math tasks: number lines, input fields, multiple choice
      if ('TASK_KEBAB'.includes('math') || 'TASK_KEBAB'.includes('egma')) {
        // Number line sliders
        const sliders = $body.find('input[type="range"], .slider input, .number-line input');
        if (sliders.length > 0) {
          const randomValue = Math.floor(Math.random() * 100) + 1;
          cy.wrap(sliders.first()).invoke('val', randomValue).trigger('input').trigger('change');
          cy.wait(500);
        }
        
        // Number inputs
        const numberInputs = $body.find('input[type="number"]');
        if (numberInputs.length > 0) {
          const randomNumber = Math.floor(Math.random() * 20) + 1;
          cy.wrap(numberInputs.first()).clear().type(randomNumber.toString());
          cy.wait(500);
        }
      }
      
      // Reasoning tasks: multiple choice, pattern selection
      if ('TASK_KEBAB'.includes('reasoning') || 'TASK_KEBAB'.includes('matrix')) {
        const choices = $body.find('[data-choice], .choice-button, .response-button, .answer-choice, .option, .choice');
        if (choices.length > 0) {
          const randomIndex = Math.floor(Math.random() * choices.length);
          cy.wrap(choices.eq(randomIndex)).click();
          cy.wait(500);
        }
      }
      
      // Memory tasks: card clicks, sequence interactions
      if ('TASK_KEBAB'.includes('memory')) {
        const cards = $body.find('.card, .memory-card, [data-card], .clickable-item');
        if (cards.length > 0) {
          const randomCard = cards.eq(Math.floor(Math.random() * cards.length));
          cy.wrap(randomCard).click();
          cy.wait(500);
        }
      }
      
      // Audio tasks: play buttons, response buttons
      const audioButtons = $body.find('button:contains("Play"), .play-button, .audio-button, button:contains("Listen")');
      if (audioButtons.length > 0) {
        cy.wrap(audioButtons.first()).click();
        cy.wait(2000); // Wait for audio
      }
      
      // General multiple choice
      const generalChoices = $body.find('.choice, .option, .response, [data-option], .answer');
      if (generalChoices.length > 0) {
        const randomChoice = generalChoices.eq(Math.floor(Math.random() * generalChoices.length));
        cy.wrap(randomChoice).click();
        cy.wait(500);
      }
    }
  });
});
EOL

    # Replace placeholders
    sed -i "s/TASK_NAME/${task_name}/g" "cypress/e2e/${task_kebab}_enhanced.cy.js"
    sed -i "s/TASK_KEBAB/${task_kebab}/g" "cypress/e2e/${task_kebab}_enhanced.cy.js"
    
    echo "✅ Created enhanced test for ${task_name}"
}

# Create enhanced tests for all tasks
for task in "${TASKS[@]}"; do
    # Convert to title case for display name
    task_name=$(echo "$task" | sed 's/-/ /g' | sed 's/\b\w/\U&/g')
    create_enhanced_test "$task_name" "$task"
done

echo ""
echo "🎉 All enhanced tests created!"
echo "📊 Features added to each test:"
echo "   • State-based loop detection"
echo "   • Progressive interaction strategies (6 levels)"
echo "   • Task-specific interaction logic"
echo "   • Visited state tracking"
echo "   • Intelligent escalation when stuck"
echo "   • Enhanced logging and debugging"
echo ""
echo "🚀 To test the enhanced EGMA version:"
echo "   npx cypress run --spec \"cypress/e2e/egma-math_enhanced.cy.js\" --browser chrome --headless" 