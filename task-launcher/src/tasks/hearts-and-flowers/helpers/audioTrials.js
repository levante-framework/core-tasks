import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';

export const replayButtonSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="38" viewBox="0 0 44 38" fill="none">
      <path d="M34.561 11.7551C34.2268 11.3413 33.7419 11.0773 33.2131 11.021C32.6842 10.9648 32.1547 11.1209 31.741 11.4551C31.3272 11.7892 31.0632 12.2741 31.0069 12.8029C30.9507 13.3318 31.1068 13.8613 31.441 14.2751C32.4514 15.6489 32.9964 17.3097 32.9964 19.0151C32.9964 20.7205 32.4514 22.3812 31.441 23.7551C31.2025 24.049 31.0524 24.4045 31.008 24.7804C30.9635 25.1562 31.0267 25.537 31.1901 25.8784C31.3534 26.2198 31.6103 26.5078 31.9309 26.709C32.2514 26.9102 32.6225 27.0164 33.001 27.0151C33.2997 27.0161 33.595 26.9501 33.8649 26.8221C34.1349 26.694 34.3727 26.5071 34.561 26.2751C36.1474 24.1872 37.0063 21.6372 37.0063 19.0151C37.0063 16.3929 36.1474 13.8429 34.561 11.7551Z" fill="#275BDD"/>
      <path d="M37.28 5.47428C37.0778 5.30619 36.8444 5.17957 36.5932 5.10167C36.3421 5.02376 36.078 4.99609 35.8162 5.02024C35.5543 5.04438 35.2997 5.11986 35.0671 5.24238C34.8344 5.36489 34.6281 5.53204 34.46 5.73428C34.2919 5.93651 34.1653 6.16988 34.0874 6.42104C34.0095 6.67221 33.9818 6.93626 34.006 7.19812C34.0301 7.45999 34.1056 7.71453 34.2281 7.94722C34.3506 8.17991 34.5178 8.38619 34.72 8.55428C36.3241 9.79402 37.6307 11.3767 38.5442 13.1865C39.4578 14.9963 39.9552 16.9875 40 19.0143C39.9552 21.0411 39.4578 23.0322 38.5442 24.8421C37.6307 26.6519 36.3241 28.2345 34.72 29.4743C34.5175 29.6422 34.3501 29.8484 34.2274 30.0811C34.1047 30.3138 34.0291 30.5684 34.0049 30.8303C33.9808 31.0923 34.0085 31.3564 34.0866 31.6076C34.1647 31.8588 34.2916 32.0922 34.46 32.2943C34.648 32.52 34.8835 32.7016 35.1497 32.826C35.4159 32.9505 35.7062 33.0148 36 33.0143C36.4673 33.0152 36.9202 32.8524 37.28 32.5543C39.3409 30.9431 41.0144 28.8905 42.1773 26.5473C43.3403 24.2041 43.9631 21.6299 44 19.0143C43.9631 16.3986 43.3403 13.8245 42.1773 11.4813C41.0144 9.1381 39.3409 7.08542 37.28 5.47428ZM26.94 1.25428C26.636 1.07874 26.2911 0.986328 25.94 0.986328C25.5889 0.986328 25.244 1.07874 24.94 1.25428L12 10.1543H2C1.46957 10.1543 0.960859 10.365 0.585786 10.7401C0.210714 11.1151 0 11.6238 0 12.1543V25.8743C0 26.4047 0.210714 26.9134 0.585786 27.2885C0.960859 27.6636 1.46957 27.8743 2 27.8743H12L24.82 36.6743C25.1712 36.9015 25.5817 37.0198 26 37.0143C26.5304 37.0143 27.0391 36.8036 27.4142 36.4285C27.7893 36.0534 28 35.5447 28 35.0143V3.01428C27.999 2.65247 27.8999 2.2977 27.7133 1.98776C27.5266 1.67782 27.2594 1.42433 26.94 1.25428Z" fill="#275BDD"/>
  </svg>`.trim();

/**
 * Overrides some of the properties of a jsPsychAudioMultiResponse object to allow for replaying audio.
 * This function should be called before the trial is added to the timeline.
 * @param trial the jsPsychAudioMultiResponse object to override
 * @param jsPsychPluginApi the jsPsych pluginApi from which to retrieve the audio context and audio buffer
 * @param replayButtonHtmlId the html id of the replay button
 */
export function overrideAudioTrialForReplayableAudio(trial, jsPsychPluginApi, replayButtonHtmlId) {
  if (trial.type !== jsPsychAudioMultiResponse) {
    throw new Error(`Expected jsPsychAudioTrial to be of type jsPsychAudioMultiResponse but got ${trial.type}`);
  }
  if (!jsPsychPluginApi) {
    throw new Error(`Expected jsPsychPluginApi to be defined but got ${jsPsychPluginApi}`);
  }
  if (!replayButtonHtmlId) {
    throw new Error(`Expected replayButtonHtmlId to be defined but got ${replayButtonHtmlId}`);
  }

  trial.audioReplayOverrides = {
    originalOnLoad: trial.on_load,
    originalOnFinish: trial.on_finish,
    jsPsychPluginApi,
    promptAudio: trial.stimulus,
    audioReplaySource: null,
    replayAudioAsyncFunction: async () => {
      // check whether audio is already playing
      if (trial.audioReplayOverrides.audioReplaySource) {
        return;
      }
    
      const jsPsychAudioCtx = trial.audioReplayOverrides.jsPsychPluginApi.audioContext();
    
      const audioAsset = (typeof trial.audioReplayOverrides.promptAudio === 'function') ?
        trial.audioReplayOverrides.promptAudio() : trial.audioReplayOverrides.promptAudio;
      console.log(`replaying audioId=${audioAsset}`);
      const audioBuffer = await trial.audioReplayOverrides.jsPsychPluginApi.getAudioBuffer(audioAsset);
    
      const audioSource = jsPsychAudioCtx.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.connect(jsPsychAudioCtx.destination);
      audioSource.start(0);
    
      audioSource.onended = () => {
        // signal that replay audio is not playing
        trial.audioReplayOverrides.audioReplaySource = null;
      };
      trial.audioReplayOverrides.audioReplaySource = audioSource;
    },
  };
  trial.on_load = (_) => {
    if (trial.audioReplayOverrides.originalOnLoad) {
      trial.audioReplayOverrides.originalOnLoad(_);
    }

    const replayBtn = document.getElementById(replayButtonHtmlId);
    replayBtn.addEventListener('click', trial.audioReplayOverrides.replayAudioAsyncFunction);
  };
  trial.on_finish = (_) => {
    if (trial.audioReplayOverrides.originalOnFinish) {
      trial.audioReplayOverrides.originalOnFinish(_);
    }

    if (trial.audioReplayOverrides.audioReplaySource) {
      console.log(`Stopping audio replay because of on_finish`);
      trial.audioReplayOverrides.audioReplaySource.stop();
    }
    //TODO: check that memory is not steadily increasing throughout experiment, which
    // would indicate that audio buffer or other objects are not being released properly
  };
}