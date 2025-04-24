import {
  isTaskFinished,
  getMediaAssets,
  dashToCamelCase,
  showLevanteLogoLoading,
  hideLevanteLogoLoading,
} from './tasks/shared/helpers';
import './styles/index.scss';
import taskConfig from './tasks/taskConfig';
import { RoarAppkit } from '@bdelab/roar-firekit';
import { setTaskStore } from './taskStore';
import { taskStore } from './taskStore';
import { InitPageSetup } from './utils';

export let mediaAssets: MediaAssetsType;
export class TaskLauncher {
  gameParams: GameParamsType;
  userParams: UserParamsType;
  firekit: RoarAppkit;
  constructor(firekit: RoarAppkit, gameParams: GameParamsType, userParams: UserParamsType) {
    this.gameParams = gameParams;
    this.userParams = userParams;
    this.firekit = firekit;
  }

  async init() {
    await this.firekit.startRun();

    const { taskName, language } = this.gameParams;

    const { setConfig, getCorpus, buildTaskTimeline, getTranslations } =
      taskConfig[dashToCamelCase(taskName) as keyof typeof taskConfig];

    // GCP bucket names use a format like egma-math
    // will avoid language folder if not provided
    try {
      if (taskName === 'intro') {
        mediaAssets = await getMediaAssets('intro-levante', {}, language);
      } else if (taskName === 'vocab') {
        mediaAssets = await getMediaAssets('vocab-test', {}, language);
      } else if (taskName === 'memory-game') {
        mediaAssets = await getMediaAssets('memory-game-levante', {}, language);
      } else if (taskName.includes('roar-inference')) {
        mediaAssets = await getMediaAssets(`roar-inference`, {}, language);
      } else if (taskName === 'adult-reasoning') {
        mediaAssets = await getMediaAssets('egma-math', {}, language); // adult reasoning uses the math bucket for assets
      } else {
        mediaAssets = await getMediaAssets(taskName, {}, language);
      }
    } catch (error) {
      throw new Error('Error fetching media assets: ' + error);
    }

    const config = await setConfig(this.firekit, this.gameParams, this.userParams);

    setTaskStore(config);

    // TODO: make hearts and flowers corpus? make list of tasks that don't need corpora?
    if (taskName !== 'hearts-and-flowers' && taskName !== 'memory-game' && taskName !== 'intro') {
      await getCorpus(config);
    }

    await getTranslations(config.language);

    return buildTaskTimeline(config, mediaAssets);
  }

  async run() {
    const pageSetup = new InitPageSetup(4000);
    showLevanteLogoLoading();
    const { jsPsych, timeline } = await this.init();
    hideLevanteLogoLoading();
    jsPsych.run(timeline);
    pageSetup.init();
    await isTaskFinished(() => this.firekit?.run?.completed === true && taskStore().taskComplete);
  }
}
