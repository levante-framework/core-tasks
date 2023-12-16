import _omitBy from "lodash/omitBy";
import _isNull from "lodash/isNull";
import _isUndefined from "lodash/isUndefined";
import i18next from "i18next";


export const initEgmaConfig = async (
  firekit,
  gameParams,
  userParams,
  displayElement,
) => {
  const cleanParams = _omitBy(_omitBy({ ...gameParams, ...userParams }, _isNull), _isUndefined);

  const {
    userMetadata = {},
    audioFeedback,
    language = i18next.language,
    skipInstructions,
    sequentialPractice,
    sequentialStimulus,
    corpus,
    buttonLayout,
    numberOfTrials,
    taskName,
    stimulusBlocks,
    numOfPracticeTrials,
    keyHelpers
    // storyCorpus,
    // story,
  } = cleanParams;


  language !== "en" && i18next.changeLanguage(language);

  const config = {
    userMetadata: { ...userMetadata, },
    audioFeedback: audioFeedback || "neutral",
    skipInstructions: skipInstructions ?? true,
    startTime: new Date(),
    firekit,
    displayElement: displayElement || null,
    sequentialPractice: sequentialPractice ?? true,
    sequentialStimulus: sequentialStimulus ?? true,
    // name of the csv files in the storage bucket
    corpus: corpus ?? "math-item-bank",
    buttonLayout: buttonLayout || "default",
    numberOfTrials: numberOfTrials ?? 20,
    task: taskName ?? 'egma-math',
    stimulusBlocks: stimulusBlocks ?? 3,
    numOfPracticeTrials: numOfPracticeTrials ?? 2,
    keyHelpers: keyHelpers ?? true,
    language: i18next.language
    // storyCorpus: storyCorpus ?? 'story-lion',
    // story: story ?? false,
  };

  const updatedGameParams = Object.fromEntries(
    Object.entries(gameParams).map(([key, value]) => [key, config[key] ?? value]),
  );

  await config.firekit.updateTaskParams(updatedGameParams);

  if (config.pid !== null) {
    await config.firekit.updateUser({ assessmentPid: config.pid, ...userMetadata });
  }

  return config;
};