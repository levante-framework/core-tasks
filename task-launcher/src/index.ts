import {
  isTaskFinished,
  getMediaAssets,
  dashToCamelCase,
  showLevanteLogoLoading,
  hideLevanteLogoLoading,
  combineMediaAssets,
} from './tasks/shared/helpers';
import './styles/index.scss';
import taskConfig from './tasks/taskConfig';
import { RoarAppkit } from '@levante-framework/firekit';
import { setTaskStore } from './taskStore';
import { taskStore } from './taskStore';
import { InitPageSetup, Logger } from './utils';
import { getBucketName } from './tasks/shared/helpers/getBucketName';

export let mediaAssets: MediaAssetsType;
let sharedMediaAssets: MediaAssetsType;

export class TaskLauncher {
  gameParams: GameParamsType;
  userParams: UserParamsType;
  firekit: RoarAppkit;
  logger?: LevanteLogger;
  constructor(firekit: RoarAppkit, gameParams: GameParamsType, userParams: UserParamsType, logger?: LevanteLogger) {
    this.gameParams = gameParams;
    this.userParams = userParams;
    this.firekit = firekit;
    Logger.setInstance(logger, gameParams, userParams);
  }

  async init() {
    await this.firekit.startRun();

    const { taskName, language } = this.gameParams;
    const { setConfig, getCorpus, buildTaskTimeline, getTranslations } =
      taskConfig[dashToCamelCase(taskName) as keyof typeof taskConfig];

    const isDev = this.firekit.firebaseProject?.firebaseApp?.options?.projectId === 'hs-levante-admin-dev';
    const bucketName = getBucketName(taskName, isDev);
    const sharedBucketName = getBucketName('shared', isDev);

    try {
      // will avoid language folder if not provided
      mediaAssets = await getMediaAssets(bucketName, {}, language);
      sharedMediaAssets = await getMediaAssets(sharedBucketName, {}, language);
    } catch (error) {
      throw new Error('Error fetching media assets: ' + error);
    }

    mediaAssets = combineMediaAssets(mediaAssets, sharedMediaAssets);

    const config = await setConfig(this.firekit, this.gameParams, this.userParams);

    setTaskStore(config);

    // TODO: make hearts and flowers corpus? make list of tasks that don't need corpora?
    if (taskName !== 'hearts-and-flowers' && taskName !== 'memory-game' && taskName !== 'intro') {
      await getCorpus(config, isDev);
    }

    await getTranslations(isDev, config.language);

    return buildTaskTimeline(config, mediaAssets);
  }

  async run() {
    showLevanteLogoLoading();
    const { jsPsych, timeline } = await this.init();
    hideLevanteLogoLoading();
    const logger = Logger.getInstance();
    logger.capture('Task Launched', {
      taskName: this.gameParams.taskName,
      language: this.gameParams.language,
      gameParams: this.gameParams,
      userParams: this.userParams,
    });
    jsPsych.run(timeline);
    const translations = taskStore().translations;
    const pageSetup = new InitPageSetup(4000, translations);
    pageSetup.init();
    await isTaskFinished(() => this.firekit?.run?.completed === true && taskStore().taskComplete);
  }
}
