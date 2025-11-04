# Screenshot Scripts

This directory contains the current working screenshot capture scripts for Levante tasks.

## Current Working Scripts

### Memory Game
- `memory_simple_pattern.cy.js` - Memory game screenshot capture
- Run with: `bash run_memory_simple.sh`

### Mental Rotation
- `mental-rotation_120_frames.cy.js` - Mental rotation with exactly 120 frames
- Run with: `bash run_mental_rotation_120_frames.sh`

### Vocabulary
- `vocab_240_frames.cy.js` - Vocabulary task with exactly 240 frames
- Run with: `bash run_vocab_240_frames.sh`

### Theory of Mind
- `theory-of-mind_240_frames.cy.js` - Theory of Mind task with exactly 240 frames
- Run with: `bash run_theory_of_mind_240_frames.sh`

### Same-Different Selection
- `same-different-selection_240_frames.cy.js` - Same-Different Selection task with exactly 240 frames
- Run with: `bash run_same_different_selection_240_frames.sh`

### TROG
- `trog_helpers_pattern.cy.js` - TROG task screenshot capture
- Run with: `bash run_trog_helpers_pattern.sh`

### Hearts and Flowers
- `hearts-and-flowers_helpers_pattern.cy.js` - Hearts and flowers task capture
- Run with: `bash run_hearts_and_flowers_screenshots.sh`

### EGMA Math
- `egma_math_working_pattern.cy.js` - EGMA math task screenshot capture
- Run with: `bash run_memory_capture.sh` (legacy script name)

## Usage

All scripts are designed to:
- Mock fullscreen API to prevent browser issues
- Take numbered screenshots with zero-padding
- Use task-specific interaction strategies
- Continue capturing even if the task completes early
- Handle errors gracefully

Run scripts from the `task-launcher` directory.

## E2E Screenshot Scripts Notes
Need to tell cursor to always give correct answers to the questions.
Avoid recursive functions as they overload cypress

## How to run the scripts

1. Run the script
2. Wait for the script to finish
3. Check the screenshots in the  `screenshots` directory

## How to update the screenshots
Move "keepers" to the `usable-screenshots` directory.   
