import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import shuffle from 'lodash/shuffle';
import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import { Logger } from '../../../utils/logger';
import { addExperimenterButtons, addKeyHelpers, setupFullscreenButton } from '../../shared/helpers';
import { shouldTerminateCat } from '../../shared/helpers/shouldTerminateCat';
import { finishTaskEarly } from '../../shared/trials';
import { isTouchScreen, jsPsych } from '../../taskSetup';
import { setupHafMultiResponseTouchRouting } from '../helpers/touchResponseRouting';
import {
  type CorpusRow,
  getCorrectInputSide,
  getStimulusLayout,
  getStimulusSideFromPosition,
  HaFStimulusType,
  InputKeyType,
  isHfV2,
  ResponseSideType,
  StimulusSideType,
} from '../helpers/utils';

/** The corpus row this trial was built from (see buildBlockTimelineVariables in timeline.ts) */
const getCorpusRow = (): CorpusRow => jsPsych.timelineVariable('corpusRow');
const isPracticeRow = (row: CorpusRow) => row.assessmentStage === 'practice_response';
// Practice trials are not timed, so they have no presentation time (null means no time limit)
// TODO: Test rows with a blank time_limit (v1) aren't timed either; deprecate when v1 is obsolete. For now, treat blank time_limit as null (no time limit) for both practice and test rows.
const getPresentationTime = (row: CorpusRow) =>
  isPracticeRow(row) || !String(row.timeLimit ?? '').trim() ? null : Number(row.timeLimit);

/**
 *TODO: we should perhaps allow {@link https://www.jspsych.org/7.2/overview/media-preloading/#automatic-preloading automatic preload}
  of the stimulus image and modify the DOM nodes that jsPsych creates in on_load?
  */
export function stimulus(
  onTrialFinishTimelineCallback: ((data: Record<string, unknown>) => void) | undefined = undefined,
) {
  return {
    type: jsPsychHTMLMultiResponse,
    data: () => {
      const row = getCorpusRow();
      return {
        // not camelCase because firekit
        save_trial: true,
        assessment_stage: row.assessmentStage,
        corpus_trial_type: row.trialType,
        // not for firekit
        isPracticeTrial: isPracticeRow(row),
      };
    },
    stimulus: () => {
      return getStimulusLayout(
        mediaAssets.images[jsPsych.timelineVariable('stimulus')],
        getStimulusSideFromPosition(jsPsych.timelineVariable('position')),
      );
    },
    on_load: () => {
      // Timed (non-practice) trials end on a timeout instead of trial_duration, so it can be restarted after pause
      const presentationTime = getPresentationTime(getCorpusRow());
      if (presentationTime !== null) {
        taskStore('currentTrialTimeLimitMs', presentationTime);

        const currentTrialTimeout = jsPsych.pluginAPI.setTimeout(() => {
          if (taskStore().isPaused || taskStore().currentTrialTimeoutId !== currentTrialTimeout) return;
          jsPsych.finishTrial();
        }, presentationTime);

        taskStore('currentTrialTimeoutId', currentTrialTimeout);
      }

      // document.getElementById('jspsych-html-multi-response-btngroup').classList.add('btn-layout-hf');
      document.getElementById('jspsych-html-multi-response-stimulus')?.classList.add('haf-parent-container');
      document.getElementById('jspsych-html-multi-response-btngroup')?.classList.add('haf-parent-container');
      document.getElementById('jspsych-html-multi-response-btngroup')?.classList.add('lev-response-row');
      document.getElementById('jspsych-html-multi-response-btngroup')?.classList.add('linear-4');

      const responseButtons = document.querySelectorAll('.jspsych-html-multi-response-button');
      responseButtons.forEach((button, i) => {
        addKeyHelpers(button as HTMLElement, i);
      });
      if (isHfV2()) setupHafMultiResponseTouchRouting();

      addExperimenterButtons();
      setupFullscreenButton();
    },
    button_choices: [StimulusSideType.Left, StimulusSideType.Right],
    keyboard_choices: isTouchScreen ? InputKeyType.NoKeys : [InputKeyType.ArrowLeft, InputKeyType.ArrowRight],
    button_html: [
      `
    <div class='response-container--small'>
      <button class='secondary--green'></button>
    </div>`,
      `<div class='response-container--small'>
      <button class='secondary--green'></button>
    </div>`,
    ],
    on_finish: (data: Record<string, unknown>) => {
      clearTimeout(taskStore().currentTrialTimeoutId);
      jsPsych.pluginAPI.cancelAllKeyboardResponses();

      taskStore('currentTrialTimeoutId', undefined);
      taskStore('currentTrialTimeLimitMs', null);

      const row = getCorpusRow();
      const isPractice = isPracticeRow(row);
      const trialType = row.trialType;
      const stimulusPosition = jsPsych.timelineVariable('position');
      const stimulusType = jsPsych.timelineVariable('stimulus');

      // Non-practice trials have a time limit and can time out; for practice trials this just flags an absent response.
      data.timedOut = data.button_response === null && data.keyboard_response === null;

      // get response position
      let response: number | null;
      if (data.button_response === 0 || data.button_response === 1) {
        response = data.button_response;
      } else if (
        data.keyboard_response === InputKeyType.ArrowLeft ||
        data.keyboard_response === InputKeyType.ArrowRight
      ) {
        response = data.keyboard_response === InputKeyType.ArrowLeft ? 0 : 1;
      } else if (data.timedOut) {
        response = null;
      } else {
        Logger.getInstance().error(new Error(`Invalid response: ${data.button_response} or ${data.keyboard_response}`));
        response = null;
      }

      const stimulusSide = getStimulusSideFromPosition(stimulusPosition);

      // record whether answer was correct or not
      const validAnswer = getCorrectInputSide(stimulusType, stimulusSide);
      data.correct = validAnswer === response;

      if (isHfV2()) {
        shouldTerminateCat();
      } else if (!isPractice) {
        // v1 ends the task after maxIncorrect wrong test answers in a row
        if (data.correct) {
          taskStore('numIncorrect', 0);
        } else {
          taskStore.transact('numIncorrect', (oldVal: number) => oldVal + 1);
        }
        if (taskStore().numIncorrect === taskStore().maxIncorrect) {
          finishTaskEarly('errorOut');
        }
      }

      //TODO: move these to timeline-level callback/variables
      taskStore('isCorrect', data.correct);
      taskStore('stimulus', stimulusType);
      taskStore('stimulusSide', stimulusSide);

      // save item uid for data analysis
      const itemUid = `hf_${trialType === 'hearts and flowers' ? 'heartsflowers' : trialType}_${stimulusType}`;

      let responseData: ResponseSideType | null;
      if (response === 0) {
        responseData = ResponseSideType.Left;
      } else if (response === 1) {
        responseData = ResponseSideType.Right;
      } else {
        responseData = null;
      }

      jsPsych.data.addDataToLastTrial({
        item: stimulusType,
        answer: validAnswer === 0 ? ResponseSideType.Left : ResponseSideType.Right,
        response: responseData,
        responseLocation: response,
        itemUid: itemUid,
        presentationTime: getPresentationTime(row),
      });

      if (!isPractice) taskStore.transact('testTrialCount', (oldVal) => oldVal + 1);

      if (onTrialFinishTimelineCallback) {
        onTrialFinishTimelineCallback(data);
      }
    },

    // DEFAULTS
    // trial_duration: null,
    // response_ends_trial: true,
  };
}

const randomPosition = () => Math.round(Math.random());

/**
 * Builds timeline_variables property to be used along with our "stimulus".
 * From specs: "To maintain balance between right/left stimulus presentation and prevent long sequences,
 * repetitive sequences using only one side, we grouped trials into sets of 4.
 * Within each set, 2 trials are randomly assigned to each side.""
 * @param {number} trialCount
 * @param {HaFStimulusType} stimulusType StimulusType.Heart or StimulusType.Flower
 */
export function buildHeartsOrFlowersTimelineVariables(trialCount: number, stimulusType: HaFStimulusType) {
  if (stimulusType !== HaFStimulusType.Heart && stimulusType !== HaFStimulusType.Flower) {
    const errorMessage = `Invalid stimulusType: ${stimulusType} for buildSubtimelineVariables()`;
    Logger.getInstance().error(new Error(errorMessage));
    throw new Error(errorMessage);
  }
  const jsPsychTimelineVariablesArray: Array<{
    stimulus: HaFStimulusType;
    position: number;
  }> = [];
  const setsOfFourCount = Math.floor(trialCount / 4);
  for (let i = 0; i < setsOfFourCount; i++) {
    jsPsychTimelineVariablesArray.push({ stimulus: stimulusType, position: 0 });
    jsPsychTimelineVariablesArray.push({ stimulus: stimulusType, position: 1 });
    jsPsychTimelineVariablesArray.push({
      stimulus: stimulusType,
      position: randomPosition(),
    });
    jsPsychTimelineVariablesArray.push({
      stimulus: stimulusType,
      position: randomPosition(),
    });
  }
  const remainderCount = trialCount % 4;
  if (remainderCount >= 1) {
    jsPsychTimelineVariablesArray.push({ stimulus: stimulusType, position: 0 });
  }
  if (remainderCount >= 2) {
    jsPsychTimelineVariablesArray.push({ stimulus: stimulusType, position: 1 });
  }
  if (remainderCount >= 3) {
    jsPsychTimelineVariablesArray.push({
      stimulus: stimulusType,
      position: randomPosition(),
    });
  }
  return jsPsychTimelineVariablesArray;
}

export function buildMixedTimelineVariables(trialCount: number) {
  const heartLeft = { stimulus: HaFStimulusType.Heart, position: 0 };
  const heartRight = { stimulus: HaFStimulusType.Heart, position: 1 };
  const flowerLeft = { stimulus: HaFStimulusType.Flower, position: 0 };
  const flowerRight = { stimulus: HaFStimulusType.Flower, position: 1 };
  const optionsToRandomize = [heartLeft, heartRight, flowerLeft, flowerRight];

  const jsPsychTimelineVariablesArray: Array<{
    stimulus: HaFStimulusType;
    position: number;
  }> = [];
  let sequence: Array<{ stimulus: HaFStimulusType; position: number }> = [];
  for (let i = 0; i < trialCount; i++) {
    if (sequence.length === 0) {
      sequence = shuffle(optionsToRandomize);
    }
    const item = sequence.pop();
    if (item !== undefined) jsPsychTimelineVariablesArray.push(item);
  }
  return jsPsychTimelineVariablesArray;
}
