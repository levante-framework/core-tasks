import { 
  isTaskFinished, 
  getMediaAssets, 
  dashToCamelCase, 
  showLevanteLogoLoading, 
  hideLevanteLogoLoading, 
  setTaskStore
} from './tasks/shared/helpers';
import './styles/task.scss';
import taskConfig from './tasks/taskConfig';

export let mediaAssets;
export class TaskLauncher {
  constructor(firekit, gameParams, userParams, displayElement) {
    this.gameParams = gameParams;
    this.userParams = userParams;
    this.firekit = firekit;
    this.displayElement = displayElement;
  }

  async init() {
    await this.firekit.startRun();

    const { taskName, language } = this.gameParams;

    const { setConfig, getCorpus, buildTaskTimeline, getTranslations } =
      taskConfig[dashToCamelCase(taskName)];

    // GCP bucket names use a format like egma-math
    // will avoid language folder if not provided
    try {
      if (taskName === 'vocab') {
        mediaAssets = await getMediaAssets('vocab-test', {}, language);
      } else if (taskName === 'memory-game') {
        mediaAssets = await getMediaAssets('memory-game-levante', {}, language);
      } else {
        mediaAssets = await getMediaAssets(taskName, {}, language);
      }
    } catch (error) {
      throw new Error('Error fetching media assets: ', error);
    }

    const config = await setConfig(this.firekit, this.gameParams, this.userParams, this.displayElement);

    setTaskStore(config)

    // TODO: make hearts and flowers corpus
    if (taskName !== 'hearts-and-flowers' && taskName !== 'memory-game') {
      await getCorpus(config);
    }

    await getTranslations(config.language);

    return buildTaskTimeline(config, mediaAssets);
  }

  async run() {
    showLevanteLogoLoading();
    const { jsPsych, timeline } = await this.init();
    hideLevanteLogoLoading();
    jsPsych.run(timeline);
    await isTaskFinished(() => this.firekit.run.completed === true);
  }
}
