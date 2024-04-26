// setup
import { jsPsych } from '../taskSetup';
import { fixation } from './trials/fixation';
import { initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';
import store from 'store2';
import { mediaAssets } from '../..';

// trials
import { exitFullscreen } from '../shared/trials';
import { stimulus, buildHeartsOrFlowersTimelineVariables, buildMixedTimelineVariables } from './trials/stimulus';
import {
  buildInstructionPracticeTrial,
  buildStimulusInvariantPracticeFeedback,
  buildMixedPracticeFeedback,
} from './trials/practice';
import {
  introduction,
  buildInstructionTrial,
  timeToPractice,
  keepUp,
  keepGoing,
  timeToPlay,
  heartsAndFlowers,
  endGame,
} from './trials/instructions';
import { t } from 'i18next';
import { StimulusType, StimulusSideType, AssessmentStageType } from './helpers/utils';

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

  // To build our trials for the Instruction section, let's first gather all the static data
  let instructionsPromptAudioAsset, instructionsMascotAsset, instructionsPromptText;
  let practiceStimulusSide1, instructionPracticeStaticData1, practiceStimulusSide2, instructionPracticeStaticData2;
  const audioAsset = mediaAssets.audio.heartInstruct1;
  if (stimulusType === StimulusType.Heart) {
    //Intro screen
    instructionsPromptText = store.session.get('translations').heartInstruct1; // heart-instruct1, "This is the heart game. Here's how you play it."
    instructionsPromptAudioAsset = mediaAssets.audio.heartInstruct1;
    instructionsMascotAsset = mediaAssets.images.animalWhole;
    //First instruction practice
    practiceStimulusSide1 = StimulusSideType.Left;
    instructionPracticeStaticData1 = {
      text: store.session.get('translations').heartInstruct2, // heart-instruct2, "When you see a <b>heart</b>, press the button on the <b>same</b> side."
      stimulusType: stimulusType,
    };
    //Second instruction practice
    practiceStimulusSide2 = StimulusSideType.Right;
    instructionPracticeStaticData2 = {
      text: store.session.get('translations').heartPracticeFeedback1, // heart-practice-feedback1, "The heart is on the right side. Press the right button.")
      stimulusType: stimulusType,
    };
  } else if (stimulusType === StimulusType.Flower) {
    //Intro screen
    instructionsPromptText = store.session.get('translations').flowerInstruct1, // flower-instruct1, "This is the flower game. Here's how you play."
    instructionsPromptAudioAsset = mediaAssets.audio.flowerInstruct1;
    instructionsMascotAsset = mediaAssets.images.animalWhole;
    //First instruction practice
    practiceStimulusSide1 = StimulusSideType.Right;
    instructionPracticeStaticData1 = {
      text: store.session.get('translations').flowerInstruct2, // flower-instruct2, "When you see a flower, press the button on the opposite side."
      stimulusType: stimulusType,
    };
    //Second instruction practice
    practiceStimulusSide2 = StimulusSideType.Left;
    instructionPracticeStaticData2 = {
      text: store.session.get('translations').flowerPracticeFeedback1, // flower-practice-feedback1, "The flower is on the left side. Press the right button."
      stimulusType: stimulusType,
    };
  } else {
    const errorMessage = `Invalid type: ${stimulusType} for getHeartOrFlowerInstructionsSection`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Now let's build our trials
  const introTrial = buildInstructionTrial(
    instructionsMascotAsset,
    instructionsPromptAudioAsset,
    instructionsPromptText,
    store.session.get('translations').continueButtonText,
    //bottomText left undefined
  )
  const instructionPracticeFeedback = buildStimulusInvariantPracticeFeedback(feedbackTextIncorrect, feedbackTextCorrect);
  const instructionPractice1 = buildInstructionPracticeTrial(
    instructionPracticeStaticData1,
    practiceStimulusSide1,
  );
  const instructionPractice2 = buildInstructionPracticeTrial(
    instructionPracticeStaticData2,
    practiceStimulusSide2,
  );

  // Now let's build our timeline. Notice how we are pairing each practice trials with a feedback trial
  const subtimeline = [];
  subtimeline.push(introTrial);
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
  const practiceFeedback = buildStimulusInvariantPracticeFeedback(feedbackTextIncorrect, feedbackTextCorrect);
  
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
    timeline_variables: buildHeartsOrFlowersTimelineVariables(adminConfig.practiceTrialCount, stimulusType),
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
    timeline_variables: buildHeartsOrFlowersTimelineVariables(adminConfig.testTrialCount, stimulusType),
    randomize_order: false,
    //TODO: implement adminConfig.stimulusPresentationTime and adminConfig.interStimulusInterval
  });
  return subtimeline;
}

function getMixedInstructionsSection(adminConfig) {
  const feedbackTextCorrect = store.session.get('translations').feedbackGoodJob; // feedback-good-job, "Good job!" //TODO: double-check ok to use feedback-good-job instead of "Great! That's right!" which is absent from item bank anyway
  const feedbackTextIncorrect = store.session.get('translations').heartsAndFlowersTryAgain; // hearts-and-flowers-try-again, "That's not right. Try again."
  const instructionPracticeFeedback = buildStimulusInvariantPracticeFeedback(feedbackTextIncorrect, feedbackTextCorrect);

  const practiceStimulusSide1 = StimulusSideType.Left;
  const instructionPracticeStaticData1 = {
    //TODO: check that we want this one and not "REMEMBER! When you see a [...]""
    text: store.session.get('translations').heartInstruct2, // heart-instruct2, "When you see a <b>heart</b>, press the button on the <b>same</b> side."
    stimulusType: StimulusType.Heart,
  };
  const practiceStimulusSide2 = StimulusSideType.Right;
  const instructionPracticeStaticData2 = {
    //TODO: check that we want this one and not "REMEMBER! When you see a [...]""
    text: store.session.get('translations').flowerInstruct2, // flower-instruct2, "When you see a flower, press the button on the opposite side."
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
  subtimeline.push(heartsAndFlowers);
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

function getMixedPracticeSection(adminConfig) {
  const feedbackTextCorrect = store.session.get('translations').feedbackGoodJob; // feedback-good-job, "Good job!" //TODO: double-check ok to use feedback-good-job instead of "Great! That's right!" which is absent from item bank anyway
  const feedbackTextIncorrectHeart = store.session.get('translations').heartPracticeFeedback2; // heart-practice-feedback2, "Remember! When you see a HEART... on the SAME side."
  const feedbackTextIncorrectFlower = store.session.get('translations').flowerPracticeFeedback2; // flower-practice-feedback2, "When you see a FLOWER, press the button on the OPPOSITE side."
  const feedbackTexts = {
    feedbackTextCorrectHeart: feedbackTextCorrect,
    feedbackTextIncorrectHeart: feedbackTextIncorrectHeart,
    feedbackTextCorrectFlower: feedbackTextCorrect,
    feedbackTextIncorrectFlower: feedbackTextIncorrectFlower,
  }
  const practiceFeedback = buildMixedPracticeFeedback(feedbackTexts);

  const heartsAndFlowersPracticeTimeline = {
    timeline: [fixation, stimulus(true, AssessmentStageType.HeartsAndFlowersPractice), practiceFeedback],
    timeline_variables: buildMixedTimelineVariables(adminConfig.practiceTrialCount),
    randomize_order: false,
    //TODO: implement adminConfig.stimulusPresentationTime and adminConfig.interStimulusInterval
  };

  const heartsAndFlowersPostPracticeBlock = {
    timeline: [keepUp, keepGoing, timeToPlay],
  };

  return [timeToPractice, heartsAndFlowersPracticeTimeline, heartsAndFlowersPostPracticeBlock];
}

function getMixedTestSection(adminConfig) {
  const heartsAndFlowersTimeline = {
    timeline: [fixation, stimulus(false, AssessmentStageType.HeartsAndFlowersStimulus)],
    timeline_variables: buildMixedTimelineVariables(adminConfig.testTrialCount),
    randomize_order: false,
    //TODO: implement adminConfig.stimulusPresentationTime and adminConfig.interStimulusInterval

    //TODO: Not sure what to do with this. Double check we don't need it
    // sample: {
    //   type: 'without-replacement',
    //   size: 1,
    // },
    // // With the sample parameter, the repetitions parameter is explicit.
    // // Without the sample parameter, the repetitions parameter is multiplied by the amount of timeline variables.
    // repetitions: 16,
  };
  return [heartsAndFlowersTimeline];
}