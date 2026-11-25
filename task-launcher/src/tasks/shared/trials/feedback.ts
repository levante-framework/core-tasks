import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import { camelize, PageAudioHandler } from '../helpers';

/**
 * What a feedback screen shows for one outcome: prompts play in order, the first shown above the image
 * and the rest below it. Tasks with feedback rows in their corpus pass these from the row.
 */
export type FeedbackContent = { prompts: string[]; image?: string };

/**
 * A practice feedback screen with a Continue button, for the outcome of the trial before it.
 *
 * Tasks without feedback rows use the defaults: a smiling face with promptOnCorrect, or a sad face with
 * "not quite right" followed by promptOnIncorrect. Tasks with feedback rows pass corpusContent instead;
 * an outcome it leaves out falls back to the defaults.
 */
export const feedback = (
  isPractice = false,
  promptOnIncorrect?: string,
  promptOnCorrect = 'feedbackCorrect',
  corpusContent?: { correct?: FeedbackContent; incorrect?: FeedbackContent },
) => {
  // Guards against the chained prompt audio bleeding into the next trial when
  // the user clicks Continue before the first feedback audio finishes playing.
  // stopAndDisconnectNode() in on_finish calls stop(), which fires onended.
  let trialFinished = false;

  const getContent = (isCorrect: boolean): Required<FeedbackContent> => {
    const fromCorpus = isCorrect ? corpusContent?.correct : corpusContent?.incorrect;
    const defaults = isCorrect
      ? { prompts: [promptOnCorrect], image: 'smilingFace@2x' }
      : { prompts: ['feedbackNotQuiteRight', ...(promptOnIncorrect ? [promptOnIncorrect] : [])], image: 'sadFace@2x' };
    return {
      prompts: fromCorpus?.prompts.length ? fromCorpus.prompts : defaults.prompts,
      image: fromCorpus?.image || defaults.image,
    };
  };

  return {
    timeline: [
      {
        type: jsPsychHtmlMultiResponse,
        stimulus: () => {
          const t = taskStore().translations;
          const { prompts, image } = getContent(Boolean(taskStore().isCorrect));
          const [mainPrompt, ...followUpPrompts] = prompts;
          const imageUrl = mediaAssets.images[image];

          return `<div class="lev-stimulus-container">
                            <div class="lev-row-container instruction">
                                <p>${t[camelize(mainPrompt)]}</p>
                            </div>
                            <div class="lev-stim-content">
                                <img src=${imageUrl} alt="Image not loading: ${imageUrl}. Please continue the task."'/>
                            </div>
                            ${followUpPrompts
                              .map(
                                (prompt) => `<div class="lev-row-container instruction"'>
                                <p>${t[camelize(prompt)]}</p>
                              </div>`,
                              )
                              .join('')}
                        </div>`;
        },
        button_choices: ['Continue'],
        keyboard_choices: 'NO_KEYS',
        prompt_above_buttons: true,
        button_html: () => {
          const t = taskStore().translations;
          return `<button class="primary">${t.continueButtonText}</button>`;
        },
        on_load: () => {
          trialFinished = false;
          const { prompts } = getContent(Boolean(taskStore().isCorrect));

          // play the prompts one after another, stopping if the child continues first
          const playPrompt = (index: number) => {
            PageAudioHandler.playAudio(prompts[index] || 'nullAudio', {
              restrictRepetition: {
                enabled: false,
              },
              onEnded: () => {
                if (!trialFinished && index + 1 < prompts.length) playPrompt(index + 1);
              },
            });
          };

          PageAudioHandler.stopAndDisconnectNode();
          playPrompt(0);
        },
        on_finish: () => {
          trialFinished = true;
          PageAudioHandler.stopAndDisconnectNode();
        },
      },
    ],
    conditional_function: () => {
      return (
        taskStore().nextStimulus?.notes === 'practice' ||
        taskStore().nextStimulus?.trialType === 'practice' ||
        isPractice
      );
    },
  };
};
