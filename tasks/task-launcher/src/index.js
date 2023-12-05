import store from "store2";
import { isTaskFinished } from "./tasks/shared/helpers";
import "./styles/task.scss";
import taskConfig from './tasks/taskConfig'
import { getMediaAssets, dashToCamelCase } from "./tasks/shared/helpers";

export let mediaAssets
export class TaskLauncher {
  constructor(firekit, gameParams, userParams, displayElement) {
    this.gameParams = gameParams;
    this.userParams = userParams;
    this.firekit = firekit;
    this.displayElement = displayElement;
  }

  async init() {
    await this.firekit.startRun();

    const { 
      initConfig, 
      initStore, 
      loadCorpus, 
      buildTaskTimeline, 
      getTranslations 
    } = taskConfig[dashToCamelCase(this.gameParams.taskName)]

    const { taskName, language } = this.gameParams

    // GCS bucket names use a format like egma-math
    mediaAssets = await getMediaAssets(taskName, {}, language);

    // TODO
    // const translations = await getTranslations(language)

    const config = await initConfig(
      this.firekit,
      this.gameParams,
      this.userParams,
      this.displayElement,
    );
    
    initStore()

    store.session.set("config", config);

    await loadCorpus(config);
  
    return buildTaskTimeline(config, mediaAssets);
  }

  async run() {
    const { jsPsych, timeline } = await this.init();
    jsPsych.run(timeline);
    await isTaskFinished(() => this.firekit.run.completed === true);
  }
}