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
  getHeartInstructions,
  getFlowerInstructions,
  getTimeToPractice,
  getKeepUp,
  getKeepGoing,
  getTimeToPlay,
  getMixedInstructions,
  getEndGame,
} from './trials/instructions';
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
      testTrialCount: 16,
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
  timeline.push(getEndGame());
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

  // To build our trials for the Instruction section, let's first gather all the static data
  let instructionPracticeStimulusSide1, instructionPracticePromptText1, instructionPracticePromptAudio1;
  let instructionPracticeStimulusSide2, instructionPracticePromptText2, instructionPracticePromptAudio2;
  const audioAsset = mediaAssets.audio.heartInstruct1;
  if (stimulusType === StimulusType.Heart) {
    //First instruction practice
    instructionPracticeStimulusSide1 = StimulusSideType.Left;
    instructionPracticePromptText1 = store.session.get('translations').heartInstruct2; // heart-instruct2, "When you see a <b>heart</b>, press the button on the <b>same</b> side."
    instructionPracticePromptAudio1 = mediaAssets.audio.heartInstruct2;
    //Second instruction practice
    instructionPracticeStimulusSide2 = StimulusSideType.Right;
    instructionPracticePromptText2 = store.session.get('translations').heartPracticeFeedback1; // heart-practice-feedback1, "The heart is on the right side. Press the right button.")
    instructionPracticePromptAudio2 = mediaAssets.audio.heartPracticeFeedback1;
  } else if (stimulusType === StimulusType.Flower) {
    //First instruction practice
    instructionPracticeStimulusSide1 = StimulusSideType.Right;
    instructionPracticePromptText1 = store.session.get('translations').flowerInstruct2; // flower-instruct2, "When you see a flower, press the button on the opposite side."
    instructionPracticePromptAudio1 = mediaAssets.audio.flowerInstruct2;
    //Second instruction practice
    instructionPracticeStimulusSide2 = StimulusSideType.Left;
    instructionPracticePromptText2 = store.session.get('translations').flowerPracticeFeedback1; // flower-practice-feedback1, "The flower is on the left side. Press the right button."
    instructionPracticePromptAudio2 = mediaAssets.audio.flowerPracticeFeedback1;
  } else {
    const errorMessage = `Invalid type: ${stimulusType} for getHeartOrFlowerInstructionsSection`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Now let's build our trials
  const introTrial = stimulusType === StimulusType.Heart?
    getHeartInstructions() : getFlowerInstructions();

  // feedback-good-job, "Good job!" //TODO: double-check ok to use feedback-good-job instead of "Great! That's right!" which is absent from item bank anyway
  const instructionPracticeFeedback = buildStimulusInvariantPracticeFeedback('heartsAndFlowersTryAgain', 'feedbackGoodJob'); // hearts-and-flowers-try-again, "That's not right. Try again."
  const instructionPractice1 = buildInstructionPracticeTrial(
    stimulusType,
    instructionPracticePromptText1,
    instructionPracticePromptAudio1,
    instructionPracticeStimulusSide1,
  );
  const instructionPractice2 = buildInstructionPracticeTrial(
    stimulusType,
    instructionPracticePromptText2,
    instructionPracticePromptAudio2,
    instructionPracticeStimulusSide2,
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

  let jsPsychAssessmentStage, feedbackKeyIncorrect;
  if (stimulusType === StimulusType.Heart) {
    jsPsychAssessmentStage = AssessmentStageType.HeartsPractice;
    feedbackKeyIncorrect = 'heartPracticeFeedback2'; // heart-practice-feedback2, "Remember! When you see a HEART... on the SAME side."
  } else if (stimulusType === StimulusType.Flower) {
    jsPsychAssessmentStage = AssessmentStageType.FlowersPractice;
    feedbackKeyIncorrect = 'flowerPracticeFeedback2'; // flower-practice-feedback2, "When you see a FLOWER, press the button on the OPPOSITE side."
  } else {
    const errorMessage = `Invalid type: ${stimulusType} for getHeartOrFlowerPracticeSection`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  // feedback-good-job, "Good job!" //TODO: double-check ok to use feedback-good-job instead of "Great! That's right!" which is absent from item bank anyway
  const practiceFeedback = buildStimulusInvariantPracticeFeedback(feedbackKeyIncorrect, 'feedbackGoodJob');

  //TODO: do we really need to nest these into a sub-timeline?
  const postPracticeBlock = {
    timeline: [
      getKeepUp(),
      getKeepGoing(),
      getTimeToPlay(),
    ],
  };

  // Let's prepare a callback to pass to our stimuli trials and keep track of successive correct practice trials
  let practiceWinStreakCount = 0;
  function onTrialFinishTimelineCallback(data) {
    practiceWinStreakCount = data.correct ? practiceWinStreakCount+1 : 0;
    console.log(`Practice block win streak=${practiceWinStreakCount}`);
    if (practiceWinStreakCount >= adminConfig.correctPracticeTrial) {
      console.log(`Ending practice block early: win streak=${practiceWinStreakCount}`);
      jsPsych.endCurrentTimeline();
    }
  };

  const subtimeline = [];
  subtimeline.push(getTimeToPractice());
  subtimeline.push({
    timeline: [
      fixation(adminConfig.interStimulusInterval),
      stimulus(true, jsPsychAssessmentStage, adminConfig.stimulusPresentationTime, onTrialFinishTimelineCallback),
      practiceFeedback,
    ],
    timeline_variables: buildHeartsOrFlowersTimelineVariables(adminConfig.practiceTrialCount, stimulusType),
    randomize_order: false,
    //TODO: Let's standardize the way on_finish callbacks can be defined here vs in the trial object:
    // here, only the "fixation" trial does not define an on_finish callback so it's the only one for which the
    // below commented code would get executed.
    // on_finish: (data) => {
    //   console.error(data);
    // },
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
    timeline: [
      fixation(adminConfig.interStimulusInterval),
      stimulus(false, jsPsychAssessmentStage, adminConfig.stimulusPresentationTime),
    ],
    timeline_variables: buildHeartsOrFlowersTimelineVariables(adminConfig.testTrialCount, stimulusType),
    randomize_order: false,
  });
  return subtimeline;
}

function getMixedInstructionsSection(adminConfig) {
  // feedback-good-job, "Good job!" //TODO: double-check ok to use feedback-good-job instead of "Great! That's right!" which is absent from item bank anyway
  const instructionPracticeFeedback = buildStimulusInvariantPracticeFeedback('heartsAndFlowersTryAgain', 'feedbackGoodJob'); // hearts-and-flowers-try-again, "That's not right. Try again."

  const instructionPractice1 = buildInstructionPracticeTrial(
    StimulusType.Heart,
    store.session.get('translations').heartInstruct2, // heart-instruct2, "When you see a <b>heart</b>, press the button on the <b>same</b> side."
    mediaAssets.audio.heartInstruct2,
    StimulusSideType.Left,
  );

  const instructionPractice2 = buildInstructionPracticeTrial(
    StimulusType.Flower,
    //TODO: check that we want this one and not "REMEMBER! When you see a [...]"
    store.session.get('translations').flowerInstruct2, // flower-instruct2, "When you see a flower, press the button on the opposite side."
    mediaAssets.audio.flowerInstruct2,
    StimulusSideType.Right,
  );

  const subtimeline = [];
  subtimeline.push(getMixedInstructions());
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
  // feedback-good-job, "Good job!" //TODO: double-check ok to use feedback-good-job instead of "Great! That's right!" which is absent from item bank anyway
  // heart-practice-feedback2, "Remember! When you see a HEART... on the SAME side."
  // flower-practice-feedback2, "When you see a FLOWER, press the button on the OPPOSITE side."
  const practiceFeedback = buildMixedPracticeFeedback('heartPracticeFeedback2', 'feedbackGoodJob', 'flowerPracticeFeedback2', 'feedbackGoodJob');

  // Let's prepare a callback to pass to our stimuli trials and keep track of successive correct practice trials
  let practiceWinStreakCount = 0;
  function onTrialFinishTimelineCallback(data) {
    practiceWinStreakCount = data.correct ? practiceWinStreakCount+1 : 0;
    console.log(`Practice block win streak=${practiceWinStreakCount}`);
    if (practiceWinStreakCount >= adminConfig.correctPracticeTrial) {
      console.log(`Ending practice block early: win streak=${practiceWinStreakCount}`);
      jsPsych.endCurrentTimeline();
    }
  };

  const heartsAndFlowersPracticeTimeline = {
    timeline: [
      fixation(adminConfig.interStimulusInterval),
      stimulus(
        true,
        AssessmentStageType.HeartsAndFlowersPractice,
        adminConfig.stimulusPresentationTime,
        onTrialFinishTimelineCallback
      ),
      practiceFeedback,
    ],
    timeline_variables: buildMixedTimelineVariables(adminConfig.practiceTrialCount),
    randomize_order: false,
  }

  //TODO: do we really need to nest these into a sub-timeline?
  const heartsAndFlowersPostPracticeBlock = {
    timeline: [
      getKeepUp(),
      getKeepGoing(),
      getTimeToPlay(),
    ],
  };

  return [getTimeToPractice(), heartsAndFlowersPracticeTimeline, heartsAndFlowersPostPracticeBlock];
}

function getMixedTestSection(adminConfig) {
  const heartsAndFlowersTimeline = {
    timeline: [
      fixation(adminConfig.interStimulusInterval),
      stimulus(false, AssessmentStageType.HeartsAndFlowersStimulus, adminConfig.stimulusPresentationTime),
    ],
    timeline_variables: buildMixedTimelineVariables(adminConfig.testTrialCount),
    randomize_order: false,

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