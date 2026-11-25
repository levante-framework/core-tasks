import {
  combineMediaAssets,
  dashToCamelCase,
  filterMedia,
  getAssetsPerTask,
  getMediaAssets,
  hideLevanteLogoLoading,
  isTaskFinished,
  showLevanteLogoLoading,
} from './tasks/shared/helpers';
import './styles/index.scss';
import type { RoarAppkit } from '@levante-framework/firekit';
import { setTaskStore, taskStore } from './taskStore';
import { getBucketName } from './tasks/shared/helpers/getBucketName';
import { markTaskLaunched } from './tasks/shared/helpers/taskMediaReady';
import taskConfig from './tasks/taskConfig';
import { jsPsych } from './tasks/taskSetup';
import { InitPageSetup, Logger } from './utils';

export let mediaAssets: MediaAssetsType;

export class TaskLauncher {
  gameParams: GameParamsType;
  userParams: UserParamsType;
  firekit: RoarAppkit | null;
  logger?: LevanteLogger;
  aborted = false;
  started = false;
  constructor(
    firekit: RoarAppkit | null,
    gameParams: GameParamsType,
    userParams: UserParamsType,
    logger?: LevanteLogger,
  ) {
    this.gameParams = gameParams;
    this.userParams = userParams;
    this.firekit = firekit;
    Logger.resetInstance();
    Logger.setInstance(logger, gameParams, userParams);
  }

  async init() {
    if (this.aborted) return;

    if (!this.gameParams.demoMode && this.firekit) {
      await this.firekit.startRun();
    }
    if (this.aborted) return;

    const { taskName } = this.gameParams;
    let { language } = this.gameParams;
    taskStore('language', language);

    // adding this to handle legacy two letter language codes in variant docs
    if (language === 'es') {
      language = 'es-CO';
    } else if (language === 'en') {
      language = 'en-US';
    } else if (language === 'de') {
      language = 'de-DE';
    }

    const { setConfig, getCorpus, buildTaskTimeline, getTranslations } =
      taskConfig[dashToCamelCase(taskName) as keyof typeof taskConfig];

    const isDev = this.firekit
      ? this.firekit.firebaseProject?.firebaseApp?.options?.projectId === 'hs-levante-admin-dev'
      : !!this.gameParams.demoMode;
    const taskVisualBucket = getBucketName(taskName, isDev, 'visual', language);
    const sharedVisualBucket = getBucketName('shared', isDev, 'visual', language);
    const languageAudioBucket = getBucketName('shared', isDev, 'audio', language);
    const sharedAudioBucket = getBucketName('shared', isDev, 'audio', 'shared');

    let languageAudio: MediaAssetsType;
    let sharedAudio: MediaAssetsType;
    let taskVisual: MediaAssetsType;
    let sharedVisual: MediaAssetsType;

    try {
      // will avoid language folder if not provided
      languageAudio = await getMediaAssets(languageAudioBucket, {}, language, taskName);
      if (this.aborted) return;
      sharedAudio = await getMediaAssets(sharedAudioBucket, {}, 'shared', taskName);
      if (this.aborted) return;
      taskVisual = await getMediaAssets(taskVisualBucket, {}, language, taskName);
      if (this.aborted) return;
      sharedVisual = await getMediaAssets(sharedVisualBucket, {}, language, 'shared');
    } catch (error) {
      throw new Error(`Error fetching media assets: ${error}`);
    }
    if (this.aborted) return;

    const config = await setConfig(this.firekit, this.gameParams, this.userParams);
    if (this.aborted) return;

    setTaskStore(config);

    this.firekit?.updateStopReason(taskStore().effectiveStoppingRule);

    // the helpers write shared taskStore state after their awaits, so they need to check this too
    const isAborted = () => this.aborted;

    await getTranslations(isDev, taskName, language, isAborted);
    if (this.aborted) return;

    if (taskName !== 'intro') {
      await getCorpus(config, isDev, isAborted);
      if (this.aborted) return;
    }

    await getAssetsPerTask(isDev, isAborted);
    if (this.aborted) return;

    const taskAudioAssetNames = [
      ...taskStore().assetsPerTask[taskName].audio,
      ...taskStore().assetsPerTask.shared.audio,
    ];

    // filter out language audio not relevant to current task
    const filteredLanguageAudio = filterMedia(languageAudio, [], taskAudioAssetNames, []);

    // no language audio means every audio prompt in the task will be skipped or silent
    if (Object.keys(filteredLanguageAudio.audio).length === 0) {
      Logger.getInstance().error(new Error(`No ${language} audio found for ${taskName} after filtering`), {
        source: 'init',
        taskName,
        language,
        fetchedAudioCount: Object.keys(languageAudio.audio).length,
        expectedAudioNameCount: taskAudioAssetNames.length,
      });
    }

    mediaAssets = combineMediaAssets([filteredLanguageAudio, sharedAudio, taskVisual, sharedVisual]);

    // Expose resolved media assets and translations for e2e validation (dev/test only)
    if (typeof window !== 'undefined') {
      (window as any).__mediaAssets = mediaAssets;
      (window as any).__translations = taskStore().translations;
    }

    return buildTaskTimeline(config, mediaAssets);
  }

  async run() {
    showLevanteLogoLoading();
    const ready = await this.init();
    if (!ready || this.aborted) {
      hideLevanteLogoLoading();
      return;
    }
    const { jsPsych, timeline } = ready;
    hideLevanteLogoLoading();
    const logger = Logger.getInstance();
    markTaskLaunched(this.gameParams.taskName, this.gameParams.language);
    logger.capture('Task Launched', {
      taskName: this.gameParams.taskName,
      language: this.gameParams.language,
    });

    if (this.aborted) return;

    this.started = true;
    jsPsych.run(timeline);
    const translations = taskStore().translations;
    const pageSetup = new InitPageSetup(4000, translations);
    taskStore('pageSetup', pageSetup);

    pageSetup.init();
    const checkTaskFinished =
      this.gameParams.demoMode || this.firekit === null
        ? () => taskStore().taskComplete
        : () => this.firekit?.run?.completed === true && taskStore().taskComplete;

    await isTaskFinished(checkTaskFinished);

    this.firekit?.updateStopReason(taskStore().effectiveStoppingRule);
  }

  abort() {
    this.aborted = true;
    taskStore('taskAborted', true);
    taskStore('taskComplete', true);
    if (!this.started) return;
    jsPsych.endExperiment();
  }
}
