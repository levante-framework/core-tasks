# Cypress Screenshots Setup

This document explains how to enable Cypress screenshots that capture actual test content, not just fullscreen prompts.

## Quick Start

### Enable Screenshots
```bash
npx cypress run --env takeScreenshots=true
```

### Disable Screenshots (default)
```bash
npx cypress run
```

## Working Tests with Content Capture

### 1. Intro Test with Fullscreen Mock
```bash
npx cypress run --spec "cypress/e2e/intro_fullscreen_mock.cy.js" --env takeScreenshots=true
```

### 2. Theory of Mind Test with Fullscreen Mock
```bash
npx cypress run --spec "cypress/e2e/theory_of_mind_fullscreen_mock.cy.js" --env takeScreenshots=true
```

## Key Features

### Fullscreen API Mocking
The fullscreen mock tests bypass the "Switch to fullscreen mode" requirement by:
- Mocking `document.requestFullscreen()` and related APIs
- Setting `document.fullscreenElement` to simulate fullscreen state
- Dispatching fullscreen change events
- Overriding element fullscreen methods

### Automatic Interaction
The tests automatically:
- Find and click OK buttons using multiple strategies
- Interact with jsPsych content elements
- Click buttons, images, and other interactive elements
- Monitor page changes throughout test execution

### Smart Screenshot Timing
Screenshots are taken:
- At page load and key interaction points
- Every second during monitoring loops
- Before and after button clicks
- When jsPsych content is detected
- At test completion

## Screenshot Cleanup

### Automatic Cleanup
Run the cleanup script to remove duplicates and blank screenshots:
```bash
node cleanup_screenshots.cjs
```

The cleanup script:
- Removes files smaller than 5KB (likely blank)
- Detects and removes duplicate screenshots using MD5 hashing
- Organizes remaining screenshots by content type
- Provides summary statistics

### Cleanup Results
After cleanup, you'll typically see:
- **Content screenshots**: Main page states and test content
- **Interaction screenshots**: Button clicks and user interactions  
- **Monitoring screenshots**: Regular intervals during test execution
- **jsPsych screenshots**: Actual test framework content

## File Locations

### Screenshots Directory
```
task-launcher/cypress/screenshots/
├── intro_fullscreen_mock.cy.js/
│   ├── 0001_page_loaded_[timestamp].png
│   ├── 0002_monitoring_1s_[timestamp].png
│   └── 0003_jspsych_content_found_[timestamp].png
└── theory_of_mind_fullscreen_mock.cy.js/
    ├── 0001_page_loaded_[timestamp].png
    └── 0002_jspsych_content_found_[timestamp].png
```

### Configuration Files
- `cypress.config.js` - Main Cypress configuration
- `cypress/support/commands.js` - Custom screenshot commands
- `cleanup_screenshots.cjs` - Cleanup utility script

## Technical Implementation

### Custom Commands
- `cy.takePageScreenshot(name)` - Basic screenshot with counter
- `cy.realClickWithScreenshots()` - Click with before/after screenshots
- `cy.clickWithScreenshots()` - Standard click with screenshots
- `cy.captureFrameSequence()` - Multiple screenshots over time

### Fullscreen Mock Strategy
```javascript
// Mock fullscreen API
win.document.requestFullscreen = cy.stub().resolves();
win.document.fullscreenElement = win.document.documentElement;
win.document.fullscreenEnabled = true;
win.Element.prototype.requestFullscreen = cy.stub().resolves();
```

### Screenshot Quality
- **File sizes**: 15KB+ for content screenshots vs 3KB for blank ones
- **Resolution**: 1000x660+ for meaningful content
- **Timing**: Strategic delays to capture content after loading

## Troubleshooting

### Common Issues
1. **Only fullscreen prompts captured**: Use the `*_fullscreen_mock.cy.js` tests instead of regular tests
2. **Blank screenshots**: Increase wait times or use the cleanup script
3. **Too many duplicates**: The cleanup script handles this automatically

### Best Practices
- Always run cleanup after generating screenshots
- Use the fullscreen mock tests for content capture
- Allow sufficient time for test execution (30-60 seconds)
- Monitor file sizes to verify content capture

## Example Usage

### Complete Workflow
```bash
# Start development server
npm run dev

# Run test with screenshots
npx cypress run --spec "cypress/e2e/intro_fullscreen_mock.cy.js" --env takeScreenshots=true

# Clean up results
node cleanup_screenshots.cjs

# View results
ls -la cypress/screenshots/intro_fullscreen_mock.cy.js/
```

### Expected Results
After running the intro test and cleanup:
- 15-20 unique screenshots showing actual test content
- File sizes ranging from 15KB to 50KB+
- Clear progression through test stages
- Actual jsPsych framework content visible

## Success Metrics

A successful screenshot capture session should show:
- ✅ Screenshots larger than 5KB (indicating real content)
- ✅ jsPsych content elements visible
- ✅ Test progression through multiple stages
- ✅ Interactive elements and responses captured
- ❌ No "Switch to fullscreen mode" text in final screenshots 