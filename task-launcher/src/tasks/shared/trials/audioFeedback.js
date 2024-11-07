import jsPsychAudioKeyboardResponse from '@jspsych/plugin-audio-keyboard-response';
import { taskStore } from '../helpers';

export function getAudioResponse(mediaAssets) {
  return {
    type: jsPsychAudioKeyboardResponse,
    stimulus: () => {
      if (taskStore().audioFeedback === 'binary' && taskStore().isCorrect) {
        return mediaAssets.audio.coin ?? mediaAssets.audio.nullAudio;
      }

      if (taskStore().audioFeedback === 'binary' && !taskStore().isCorrect) {
        return mediaAssets.audio.fail ?? mediaAssets.audio.nullAudio;
      }

      // neutral case
      return mediaAssets.audio.select ?? mediaAssets.audio.nullAudio;
    },
    choices: 'NO_KEYS',
    trial_ends_after_audio: true,
    post_trial_gap: 500,
    prompt: '',
  };
}
