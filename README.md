Overview of the core behavioral tasks for LEVANTE. This repo contains details and implementations (*under construction*) for each of these tasks, as well as the reasoning behind adaptations we make in order to shorten or adjust the difficulty to avoid ceiling/floor effects.

Collating item banks for all tasks [here](https://docs.google.com/spreadsheets/d/1MlU4eOd45XVMg7HrnTDGZ3rv1cfNjvjpdc8e_edQqQk/edit?usp=sharing). 


## Running Locally

For local testing during development:

```shell
# the task-launcher directory contains the task apps
cd task-launcher

# install dependencies
npm install

# run the development server
npm run dev
```

You can now locally run tasks e.g. TROG `http://localhost:8080/?task=trog`. 
Task parameters are documented here (TODO linkme).

Task details:

1. [Matrix Reasoning](https://hs-levante-assessment-dev.web.app/?task=matrix-reasoning) [George]
	- piloting 60 novel items from Rogier Kievit and Nicholas Judd
	- also using 80 Mars-IB items (Chierchia et al. 2020)

2. [Hearts & Flowers](https://hs-levante-assessment-dev.web.app/?task=hearts-and-flowers) [EF: Inhibition] [George]
	- 3.5 is the youngest you can go
	- practice trials: 6 hearts, 6 flowers, 6 mixed (1500ms + 500 ISI)
	- test trials: 8 hearts, 12 flowers, 12 mixed (1500ms), 12 mixed (1250ms)
	- 6+6+6+8+12+12+12 = 62 trials * 2s/trial = 2min — can’t save a lot of time in the task! 30s instruction?

3. [Memory Game (i.e. Corsi Block)](https://hs-levante-assessment-dev.web.app/?task=memory-game) [EF: WM] [George]
	- age-appropriate grid size could be set
	- standard forward block progresses from length 2 to length 7 sequences (3 sequences per length)
 	- backward block (given only if succeeded in forward block) similarly progresses from length 2 to 7
	- Recommendation for ages < 5: only assign the forward block (backward is too difficult)

4. [Same-Different-Selection](https://hs-levante-assessment-dev.web.app/?task=same-different-selection) [EF: Cognitive Flexibility]
	- progressive task designed by AMES lab (Jelena Obradovic and Michael Sulik) combining types of trials from the FIST and Something's-the-Same tasks to cover the full age range
	- task mock-up [here](https://docs.google.com/presentation/d/16WpVP96Yvv55gMrPmba3mFvHgIEBqBs1nodEb_H10ZE/edit?usp=sharing)
	- Original StS (Willoughby 2012) was 16 trials

5. [TROG](https://hs-levante-assessment-dev.web.app/?task=trog) [Language: Grammar]
	- Test for Reception of Grammar (Bishop, 1982)
	- "multiple-choice test where the child listens to a spoken sentence and must select one of four pictures to match what is heard. Items are organised into 20 blocks of 4 items each, with the grammatical complexity of the blocks increasing as the test progresses"
	- there's a vocab recognition test for some of the words used in the TROG that we may want to skip (or include in vocab tests?)

6. [Theory-of-Mind, Emotional Reasoning, and Hostile Attribution Battery](https://hs-levante-assessment-dev.web.app/?task=theory-of-mind) [SocialCog: Theory of Mind, Emotion Reasoning] [Rebecca]
	- modified narratives and questions [here](https://docs.google.com/document/d/1JKKrdS3_JjbLTuF682KqIoDpWIeeMhrOdfQn0Lt1Dv0/edit?usp=sharing)
	- food, snack, and dog content needs to be adapted -- illustrator is working on new illustrations


7. [Math: EGMA + Multiplication + 4AFC Number Line](https://hs-levante-assessment-dev.web.app/?task=egma-math) [Math: Symbolic Math] [Rebecca]
	- Number Identification (say the number) - (60 s; 20 items total; stop if [1] child stops on an item for 5 seconds) VERBAL
	- Number Comparison (which is bigger?) - (2 practice, 10 items; stop if child makes 4 successive errors)
	- Missing number (sequence) - (2 practice, 10 items)
	- Addition (level 1) - (20 items, 60 s; stop if [1])
	- Addition (level 2) - (5 items; stop if no correct answers on level 1, or [1])
	- Subtraction (level 1) - (20 items, 60 s; stop if [1])
	- Subtraction (level 2) - (5 items; stop if no correct answers on level 1, or [1])
	- multiplication (not part of EGMA, but add for oldest kids to avoid ceiling?)
	- *word problems (nix due to overlap with language?) - (2 practice, 6 items)*
	- total time: at least 5 minutes
	- total of 94 items (non-word problems)

8. Number Line Estimation Task [Math: Approximate Math] 
	- how many number lines (age-based?) and problems? (0-10, 0-100, 0-1000?)
	- e.g. one study used 28 stim: “The materials included a 15-cm line with one end marked with 0 and the other end marked with 100 (i.e., min = 0, max = 100) and 28 numbers: 3, 4, 6, 8, 12, 14, 17, 18, 20, 21, 24, 25, 29, 33, 39, 42, 48, 50, 52, 57, 61, 64, 72, 79, 81, 84, 90, and 96. The number 20 and 50 were used for practice.”
	- propose to make fully adaptive, with age-based starting point
	- whole number only, or consider adding fraction number lines?
	- Daniel Ansari and Bob Siegler recommend using number-to-position (i.e., given a number, indicate position on number line) rather than position-to-number -- ideally, let's pilot both with school-aged children

9. [Mental Rotation](https://hs-levante-assessment-dev.web.app/?task=mental-rotation) [Visual-Spatial] [George/Rebecca]
	- 2AFC match-to-sample task
	- item bank combining goat, ghost, and Shepard-Metzler 3D blocks stimuli rotated 0, 30, 60, 90, 120, 150, or 180 degrees (120 items, nonadaptive)
	- propose to make fully adaptive:
	- ToDo: animated familiarization trial showing how target item rotates and matches to a response option
	- 11/30/2023: added Shepard & Metzler stimuli from Mike (created by Talia Konkle?), which are black outlines on a white background.

10. [ROAR Vocab](https://hs-levante-assessment-dev.web.app/?task=vocab) [Language: Vocab] [Bria]
	- full version is 10 min; adaptive version should be 3 min

11. Child Survey [Amy & Bobby]
	- trying to standardize a 5-point positive/negative valence scale (emoji-based?)
	- questions are [here](https://docs.google.com/spreadsheets/d/1sOQv3qVwK-DQeAcySgNDCjR1TTl6_Ij-GDArM8nBeWk/edit?usp=sharing)

External tasks:
	- MEFS (MN Executive Function Scale) [EF]
	- [ROAR Single Word Reading](https://roar.education/) [Language: Single-word Reading] - external?
	- [ROAR Sentence Comprehension](https://roar.education/) [Language: Reading Comprehension] - external?
	- Expressive Vocab (ROAR?)
