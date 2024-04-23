// setup
import { jsPsych } from '../taskSetup';
import { fixation } from './trials/fixation';
import { initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';
import store from 'store2';

// trials
import { exitFullscreen } from '../shared/trials';
import { stimulus, buildSubtimelineVariables } from './trials/stimulus';
import {
  buildInstructionPracticeTrial,
  buildPracticeFeedback,
} from './trials/practice';
import {
  introduction,
  heartInstructions,
  flowerInstructions,
  timeToPractice,
  keepUp,
  keepGoing,
  timeToPlay,
  heartsAndFlowers,
  endGame,
} from './trials/instructions';
import { t } from 'i18next';
import { StimulusType, StimulusSideType, AssessmentStageType } from './trials/enums';

// export let cat;
// export let cat2;

export default function buildHeartsAndFlowersTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  //   cat = new Cat({
  //     method: 'MLE',
  //     minTheta: -6,
  //     maxTheta: 6,
  //     itemSelect: store.session('itemSelect'),
  //   });

  //   // Include new items in thetaEstimate
  //   cat2 = new Cat({
  //     method: 'MLE',
  //     minTheta: -6,
  //     maxTheta: 6,
  //     itemSelect: store.session('itemSelect'),
  //   });


  // TODO: parse from user input
  const timelineAdminConfig = {
    heart: {
      practiceTrialCount: 6,
      correctPracticeTrial: 2,
      testTrialCount: 12,
      stimulusPresentationTime: 1500,
      interStimulusInterval: 500,
    },
    flower: {
      practiceTrialCount: 6,
      correctPracticeTrial: 2,
      testTrialCount: 16,
      stimulusPresentationTime: 1500,
      interStimulusInterval: 500,
    },
    mixed1: {
      practiceTrialCount: 6,
      correctPracticeTrial: 3,
      testTrialCount: 16,
      stimulusPresentationTime: 2000,
      interStimulusInterval: 500,
    },
    mixed2: {
      // 2nd block of mixed trials does not repeat instructions nor practice sections
      // practiceTrialCount: 6,
      // correctPracticeTrial: 2,
      // testTrialCount: 16,
      stimulusPresentationTime: 1500,
      interStimulusInterval: 500,
    },
  };

  // introductionTrials, ifNotFullscreen,
  // const timeline = [
  //   preloadTrials,
  //   initialTimeline,
  //   introduction,
  //   heartInstructions,
  //   heartPracticeBlock1,
  //   heartPracticeBlock2,
  //   timeToPractice,
  //   heartPracticeTimeline,
  //   heartPostPracticeBlock,
  //   heartTimeline,
  //   flowerInstructionsBlock,
  //   flowerPracticeTimeline,
  //   flowerPostPracticeBlock,
  //   flowerTimeline,
  //   heartsAndFlowersInstructionsBlock,
  //   heartsAndFlowersPracticeTimeline,
  //   heartsAndFlowersPostPracticeBlock,
  //   heartsAndFlowersTimeline,
  //   endGame,
  //   exitFullscreen,
  // ];
  let timeline = [
    preloadTrials,
    initialTimeline,
    introduction,
  ]
  if (timelineAdminConfig.heart) {
    timeline.push(...getHeartOrFlowerSubtimelines(timelineAdminConfig.heart, StimulusType.Heart));
  }
  if (timelineAdminConfig.flower) {
    timeline.push(...getHeartOrFlowerSubtimelines(timelineAdminConfig.flower, StimulusType.Flower));
  }
  if (timelineAdminConfig.mixed1) {
    const adminConfig = timelineAdminConfig.mixed1;
    timeline.push(...getMixedInstructionsSection(adminConfig));
    timeline.push(...getMixedPracticeSection(adminConfig));
    timeline.push(...getMixedTestSection(adminConfig));
  }
  if (timelineAdminConfig.mixed2) {
    timeline.push(...getMixedTestSection(timelineAdminConfig.mixed2));
  }
  timeline.push(endGame);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}

function getHeartOrFlowerSubtimelines(adminConfig, stimulusType) {
  if (stimulusType !== StimulusType.Heart && stimulusType !== StimulusType.Flower) {
    const errorMessage = `Invalid type: ${stimulusType} for getHeartOrFlowerSubtimeline`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const subtimelines = [];

  // Instruction and Instruction Practice trials
  subtimelines.push(...getHeartOrFlowerInstructionsSection(adminConfig, stimulusType));

  // Practice trials
  subtimelines.push(...getHeartOrFlowerPracticeSection(adminConfig, stimulusType));

  // Test trials
  subtimelines.push(...getHeartOrFlowerTestSection(adminConfig, stimulusType));
  
  return subtimelines;
}

//TODO: check that it's ok to not have full screen feedback in case of correct answer,
// for both instruction practice trials and practice trials
//TODO: check if we need to repeat the whole pair when user gets it wrong or if getting right on the feedback trial is enough
function getHeartOrFlowerInstructionsSection(adminConfig, stimulusType) {

  const feedbackTextCorrect = store.session.get('translations').feedbackGoodJob; // feedback-good-job, "Good job!" //TODO: double-check ok to use feedback-good-job instead of "Great! That's right!" which is absent from item bank anyway
  const feedbackTextIncorrect = store.session.get('translations').heartsAndFlowersTryAgain; // hearts-and-flowers-try-again, "That's not right. Try again."
  const instructionPracticeFeedback = buildPracticeFeedback(feedbackTextIncorrect, feedbackTextCorrect);

  let instructions;
  // Let's build the feedback trials to pair with each instruction practice trial
  let practiceStimulusSide1, instructionPracticeStaticData1, practiceStimulusSide2, instructionPracticeStaticData2;
  //TODO: remove function wrapping on our text properties
  if (stimulusType === StimulusType.Heart) {
    instructions = heartInstructions;
    practiceStimulusSide1 = StimulusSideType.Left;
    instructionPracticeStaticData1 = {
      text: () => store.session.get('translations').heartInstruct2, // heart-instruct2, "When you see a <b>heart</b>, press the button on the <b>same</b> side."
      stimulusType: stimulusType,
    };
    practiceStimulusSide2 = StimulusSideType.Right;
    instructionPracticeStaticData2 = {
      text: () => store.session.get('translations').heartPracticeFeedback1, // heart-practice-feedback1, "The heart is on the right side. Press the right button.")
      stimulusType: stimulusType,
    };
  } else if (stimulusType === StimulusType.Flower) {
    instructions = flowerInstructions;
    practiceStimulusSide1 = StimulusSideType.Right;
    instructionPracticeStaticData1 = {
      text: () => store.session.get('translations').flowerInstruct2, // flower-instruct2, "When you see a flower, press the button on the opposite side."
      stimulusType: stimulusType,
    };
    practiceStimulusSide2 = StimulusSideType.Left;
    instructionPracticeStaticData2 = {
      text: () => store.session.get('translations').flowerPracticeFeedback1, // flower-practice-feedback1, "The flower is on the left side. Press the right button."
      stimulusType: stimulusType,
    };
  } else {
    const errorMessage = `Invalid type: ${stimulusType} for getHeartOrFlowerInstructionsSection`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  const instructionPractice1 = buildInstructionPracticeTrial(
    instructionPracticeStaticData1,
    practiceStimulusSide1,
  );

  const instructionPractice2 = buildInstructionPracticeTrial(
    instructionPracticeStaticData2,
    practiceStimulusSide2,
  );

  const subtimeline = [];
  subtimeline.push(instructions);
  // Instruction practice trials do not advance until user gets it right
  subtimeline.push({
    timeline: [instructionPractice1, instructionPracticeFeedback],
    loop_function: (data) => store.session.get('correct') === false,
  });
  subtimeline.push({
    timeline: [instructionPractice2, instructionPracticeFeedback],
    loop_function: (data) => store.session.get('correct') === false,
  });

  return subtimeline;
}

function getHeartOrFlowerPracticeSection(adminConfig, stimulusType) {

  const feedbackTextCorrect = store.session.get('translations').feedbackGoodJob; // feedback-good-job, "Good job!" //TODO: double-check ok to use feedback-good-job instead of "Great! That's right!" which is absent from item bank anyway
  let jsPsychAssessmentStage, feedbackTextIncorrect;
  if (stimulusType === StimulusType.Heart) {
    jsPsychAssessmentStage = AssessmentStageType.HeartsPractice;
    feedbackTextIncorrect = store.session.get('translations').heartPracticeFeedback2; // heart-practice-feedback2, "Remember! When you see a HEART... on the SAME side."
  } else if (stimulusType === StimulusType.Flower) {
    jsPsychAssessmentStage = AssessmentStageType.FlowersPractice;
    feedbackTextIncorrect = store.session.get('translations').flowerPracticeFeedback2; // flower-practice-feedback2, "When you see a FLOWER, press the button on the OPPOSITE side."
  } else {
    const errorMessage = `Invalid type: ${stimulusType} for getHeartOrFlowerPracticeSection`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  const practiceFeedback = buildPracticeFeedback(feedbackTextIncorrect, feedbackTextCorrect);
  
  const postPracticeBlock = {
    timeline: [
      keepUp,
      keepGoing,
      timeToPlay
    ],
  };

  const subtimeline = [];
  subtimeline.push(timeToPractice);
  subtimeline.push({
    timeline: [fixation, stimulus(true, jsPsychAssessmentStage), practiceFeedback],
    timeline_variables: buildSubtimelineVariables(adminConfig.practiceTrialCount, stimulusType),
    randomize_order: false,
    //TODO: implement "end early" when user get multiple correct answer in a row = adminConfig.correctPracticeTrial
    //TODO: implement adminConfig.stimulusPresentationTime and adminConfig.interStimulusInterval
  });
  subtimeline.push(postPracticeBlock);

  return subtimeline;
}

function getHeartOrFlowerTestSection(adminConfig, stimulusType) {
  let jsPsychAssessmentStage;
  if (stimulusType === StimulusType.Heart) {
    jsPsychAssessmentStage = AssessmentStageType.HeartsStimulus;
  } else if (stimulusType === StimulusType.Flower) {
    jsPsychAssessmentStage = AssessmentStageType.FlowersStimulus;
  } else {
    const errorMessage = `Invalid type: ${stimulusType} for getHeartOrFlowerTestSection`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  const subtimeline = []
  subtimeline.push({
    timeline: [fixation, stimulus(false, jsPsychAssessmentStage)],
    timeline_variables: buildSubtimelineVariables(adminConfig.testTrialCount, stimulusType),
    randomize_order: false,
    //TODO: implement adminConfig.stimulusPresentationTime and adminConfig.interStimulusInterval
  });
  return subtimeline;
}

function getMixedInstructionsSection(adminConfig) {
  const feedbackTextCorrect = store.session.get('translations').feedbackGoodJob; // feedback-good-job, "Good job!" //TODO: double-check ok to use feedback-good-job instead of "Great! That's right!" which is absent from item bank anyway
  const feedbackTextIncorrect = store.session.get('translations').heartsAndFlowersTryAgain; // hearts-and-flowers-try-again, "That's not right. Try again."
  const instructionPracticeFeedback = buildPracticeFeedback(feedbackTextIncorrect, feedbackTextCorrect);

  const instructions = heartsAndFlowers;
  const practiceStimulusSide1 = StimulusSideType.Left;
  const instructionPracticeStaticData1 = {
    //TODO: check that we want this one and not "REMEMBER! When you see a [...]""
    text: () => store.session.get('translations').heartInstruct2, // heart-instruct2, "When you see a <b>heart</b>, press the button on the <b>same</b> side."
    stimulusType: StimulusType.Heart,
  };
  const practiceStimulusSide2 = StimulusSideType.Right;
  const instructionPracticeStaticData2 = {
    //TODO: check that we want this one and not "REMEMBER! When you see a [...]""
    text: () => store.session.get('translations').flowerInstruct2, // flower-instruct2, "When you see a flower, press the button on the opposite side."
    stimulusType: StimulusType.Flower,
  };

  const instructionPractice1 = buildInstructionPracticeTrial(
    instructionPracticeStaticData1,
    practiceStimulusSide1,
  );

  const instructionPractice2 = buildInstructionPracticeTrial(
    instructionPracticeStaticData2,
    practiceStimulusSide2,
  );

  const subtimeline = [];
  subtimeline.push(instructions);
  // Instruction practice trials do not advance until user gets it right
  subtimeline.push({
    timeline: [instructionPractice1, instructionPracticeFeedback],
    loop_function: (data) => store.session.get('correct') === false,
  });
  subtimeline.push({
    timeline: [instructionPractice2, instructionPracticeFeedback],
    loop_function: (data) => store.session.get('correct') === false,
  });

  return subtimeline;
}

const randomPosition = () => Math.round(Math.random());

//TODO: implement correctly
function getMixedPracticeSection(adminConfig) {

  const heartsAndFlowersPracticeTimeline = {
    timeline: [fixation, stimulus(true, AssessmentStageType.HeartsAndFlowersPractice)],
    timeline_variables: [
      { stimulus: 'flower', position: 0 },
      { stimulus: 'heart', position: 1 },
      { stimulus: 'heart', position: randomPosition() },
      { stimulus: 'flower', position: randomPosition() },
      { stimulus: 'heart', position: randomPosition() },
      { stimulus: 'flower', position: randomPosition() },
    ],
  };

  const heartsAndFlowersPostPracticeBlock = {
    timeline: [keepUp, keepGoing, timeToPlay],
  };

  return [timeToPractice, heartsAndFlowersPracticeTimeline, heartsAndFlowersPostPracticeBlock];
}

//TODO: implement correctly
function getMixedTestSection(adminConfig) {
  const heartsAndFlowersTimeline = {
    timeline: [fixation, stimulus(false, AssessmentStageType.HeartsAndFlowersStimulus)],
    timeline_variables: [
      { stimulus: 'heart', position: 0 },
      { stimulus: 'heart', position: 1 },
      { stimulus: 'flower', position: 0 },
      { stimulus: 'flower', position: 1 },
    ],
    sample: {
      type: 'without-replacement',
      size: 1,
    },
    // With the sample parameter, the repetitions parameter is explicit.
    // Without the sample parameter, the repetitions parameter is multiplied by the amount of timeline variables.
    repetitions: 16,
  };
  return [heartsAndFlowersTimeline];
}