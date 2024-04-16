import store from 'store2';
import { isTaskFinished } from './tasks/shared/helpers';
import './styles/task.scss';
import taskConfig from './tasks/taskConfig';
import { getMediaAssets, dashToCamelCase } from './tasks/shared/helpers';

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

    const { 
      initConfig, 
      initStore, 
      loadCorpus, 
      buildTaskTimeline, 
      getTranslations 
    } = taskConfig[dashToCamelCase(taskName)];

    // GCP bucket names use a format like egma-math
    // will avoid language folder if not provided
    if (taskName !== 'memory-game') {
      // console.log({ taskName, })
      mediaAssets = await getMediaAssets(taskName, {}, language);
      console.log({ mediaAssets });
    }

    const config = await initConfig(this.firekit, this.gameParams, this.userParams, this.displayElement);

    initStore();

    store.session.set('config', config);

    // TODO: make hearts and flowers corpus
    if (taskName !== 'hearts-and-flowers' && taskName !== 'memory-game') {
      await loadCorpus(config);
    }

    await getTranslations();

    return buildTaskTimeline(config, mediaAssets);
  }

  async run() {
    const { jsPsych, timeline } = await this.init();
    jsPsych.run(timeline);
    await isTaskFinished(() => this.firekit.run.completed === true);
  }
}
