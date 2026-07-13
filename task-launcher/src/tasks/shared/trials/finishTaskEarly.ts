import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import { Logger } from '../../../utils';
import { jsPsych } from '../../taskSetup';
import { PageAudioHandler } from '../helpers';

export function finishTaskEarly(effectiveStoppingRule: 'time' | 'max-incorrect') {
  const t = taskStore().translations;
  setTimeout(() => {
    const removeDOMElements = (event: Event) => {
      if (event.type === 'click') {
        const buttonId = (event.target as HTMLElement)?.id;
        if (buttonId === 'exit-button') {
          document.body.innerHTML = '';
          taskStore('taskComplete', true);
          window.removeEventListener('click', removeDOMElements);
          window.removeEventListener('keydown', removeDOMElements);
        }
      } else if (event.type === 'keydown') {
        document.body.innerHTML = '';
        taskStore('taskComplete', true);
        window.removeEventListener('keydown', removeDOMElements);
        window.removeEventListener('click', removeDOMElements);
      }
    };
    window.addEventListener('click', removeDOMElements);
    window.addEventListener('keydown', removeDOMElements);
    const logger = Logger.getInstance();
    const message =
      effectiveStoppingRule === 'time'
        ? 'Task finished early: user timed out'
        : 'Task finished early: user reached max incorrect answers';
        console.log(message);
    logger.capture(message, {
      taskName: taskStore().task,
      taskFinished: taskStore().taskComplete,
    });
  }, 50); // delay so that previous key presses are not captured

  jsPsych.endExperiment(
    `<div class='lev-stimulus-container'>
            <div class='lev-row-container instruction'>
                <h1>${t.taskFinished}</h1>
            </div>
            <footer>${t.generalFooter}</footer>
            <button id="exit-button" class="primary" style=margin-top:5%>${t.generalExit}</button>
        </div>`,
    PageAudioHandler.playAudio(mediaAssets.audio.taskFinished),
  );
}
