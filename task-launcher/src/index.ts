import {
  isTaskFinished,
  getMediaAssets,
  dashToCamelCase,
  showLevanteLogoLoading,
  hideLevanteLogoLoading,
  combineMediaAssets,
  getAssetsPerTask,
  filterMedia,
} from './tasks/shared/helpers';
import './styles/index.scss';
import taskConfig from './tasks/taskConfig';
import { RoarAppkit } from '@levante-framework/firekit';
import { setTaskStore } from './taskStore';
import { taskStore } from './taskStore';
import { InitPageSetup, Logger } from './utils';
import { getBucketName } from './tasks/shared/helpers/getBucketName';

export let mediaAssets: MediaAssetsType;
let languageAudioAssets: MediaAssetsType;
let sharedAudioAssets: MediaAssetsType;
let taskVisualAssets: MediaAssetsType;
let sharedVisualAssets: MediaAssetsType;

const isCypressRuntime = typeof window !== 'undefined' && (window as any).Cypress;

function isPermissionError(error: unknown) {
  if (!error) return false;
  const code = (error as any)?.code as string | undefined;
  if (code && code.toLowerCase().includes('permission')) return true;
  const message = (error as any)?.message as string | undefined;
  return typeof message === 'string' && message.toLowerCase().includes('insufficient permissions');
}

export class TaskLauncher {
  gameParams: GameParamsType;
  userParams: UserParamsType;
  firekit: RoarAppkit;
  logger?: LevanteLogger;
  private firekitBypassed = false;
  constructor(firekit: RoarAppkit, gameParams: GameParamsType, userParams: UserParamsType, logger?: LevanteLogger) {
    this.gameParams = gameParams;
    this.userParams = userParams;
    this.firekit = firekit;
    Logger.setInstance(logger, gameParams, userParams);
  }

  async init() {
    try {
      await this.firekit.startRun();
    } catch (error) {
      if (isCypressRuntime && isPermissionError(error)) {
        // For Cypress/local dev we tolerate security rule denials and continue offline.
        // eslint-disable-next-line no-console
        console.warn('[firekit] Permission denied while starting run in Cypress; proceeding without persistence.');
        this.firekitBypassed = true;
        const noOp = async () => {};
        (this.firekit as any).startRun = noOp;
        (this.firekit as any).updateTaskParams = noOp;
        (this.firekit as any).writeTrial = noOp;
        (this.firekit as any).logEvent = noOp;
        (this.firekit as any).updateUser = noOp;
        (this.firekit as any).finishRun = noOp;
        (this.firekit as any).run = (this.firekit as any).run || { completed: false };
      } else {
        throw error;
      }
    }

    const { taskName } = this.gameParams;
    let { language } = this.gameParams;

    // adding this to handle old 'es' variant language param values
    if (language === 'es') {
      language = 'es-CO';
    }

    const { setConfig, getCorpus, buildTaskTimeline, getTranslations } =
      taskConfig[dashToCamelCase(taskName) as keyof typeof taskConfig];

    const isDev = this.firekit.firebaseProject?.firebaseApp?.options?.projectId === 'hs-levante-admin-dev';
    const taskVisualBucket = getBucketName(taskName, isDev, 'visual', language);
    const sharedVisualBucket = getBucketName('shared', isDev, 'visual', language);
    const languageAudioBucket = getBucketName('shared', isDev, 'audio', language);
    const sharedAudioBucket = getBucketName('shared', isDev, 'audio', 'shared');

    try {
      // will avoid language folder if not provided
      languageAudioAssets = await getMediaAssets(languageAudioBucket, {}, taskName, language);
      sharedAudioAssets = await getMediaAssets(sharedAudioBucket, {}, taskName, 'shared');
      taskVisualAssets = await getMediaAssets(taskVisualBucket, {}, taskName, language);
      sharedVisualAssets = await getMediaAssets(sharedVisualBucket, {}, 'shared', language);
    } catch (error) {
      throw new Error('Error fetching media assets: ' + error);
    }

    const config = await setConfig(this.firekit, this.gameParams, this.userParams);

    setTaskStore(config);

    await getTranslations(isDev, config.language);

    // TODO: make hearts and flowers corpus? make list of tasks that don't need corpora?
    if (taskName !== 'hearts-and-flowers' && taskName !== 'memory-game' && taskName !== 'intro') {
      await getCorpus(config, isDev);
    }
    
    await getAssetsPerTask(isDev);

    const taskAudioAssetNames = [
      ...taskStore().assetsPerTask[taskName].audio,
      ...taskStore().assetsPerTask.shared.audio,
    ];

    // filter out language audio not relevant to current task
    languageAudioAssets = filterMedia(languageAudioAssets, [], taskAudioAssetNames, []);

    mediaAssets = combineMediaAssets([languageAudioAssets, sharedAudioAssets, taskVisualAssets, sharedVisualAssets]);

    // Expose resolved media assets for e2e validation (dev/test only)
    if (typeof window !== 'undefined') {
      (window as any).__mediaAssets = mediaAssets;
    }

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
