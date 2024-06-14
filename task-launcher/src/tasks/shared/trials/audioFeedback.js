import jsPsychAudioKeyboardResponse from '@jspsych/plugin-audio-keyboard-response';
import { taskStore } from '../helpers';

export function getAudioResponse(mediaAssets) {
  return {
    type: jsPsychAudioKeyboardResponse,
    stimulus: () => {
      if (taskStore().audioFeedback === 'binary' && taskStore().currentTrialCorrect) {
        return mediaAssets.audio.coin;
      }

      if (taskStore().audioFeedback === 'binary' && !taskStore().currentTrialCorrect) {
        return mediaAssets.audio.fail;
      }

      // neutral case
      return mediaAssets.audio.select;
    },
    choices: 'NO_KEYS',
    trial_ends_after_audio: true,
    prompt: '',
  };
}
