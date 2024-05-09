import jsPsychAudioMultiResponse from "@jspsych-contrib/plugin-audio-multi-response";

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
    audioReplaySource: undefined,
    replayAudioAsyncFunction: async () => {
      // check whether audio is already playing
      if (trial.audioReplayOverrides.audioReplaySource) {
        return;
      }

      const jsPsychAudioCtx = trial.audioReplayOverrides.jsPsychPluginApi.audioContext();

      const audioAsset = typeof trial.audioReplayOverrides.promptAudio === 'function'
        ? trial.audioReplayOverrides.promptAudio()
        : trial.audioReplayOverrides.promptAudio;
      console.info(`replaying audioId=${audioAsset}`);
      const audioBuffer = await trial.audioReplayOverrides.jsPsychPluginApi.getAudioBuffer(audioAsset);

      const audioSource = jsPsychAudioCtx.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.connect(jsPsychAudioCtx.destination);
      audioSource.start(0);

      audioSource.onended = () => {
        if (trial.audioReplayOverrides.audioReplaySource) {
          // signal that replay audio is not playing
          trial.audioReplayOverrides.audioReplaySource = null;
        }
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
      console.info(`Stopping audio replay because of on_finish`);
      trial.audioReplayOverrides.audioReplaySource.stop();
      trial.audioReplayOverrides.audioReplaySource = null;
    }
    //TODO: check that memory is not steadily increasing throughout experiment, which
    // would indicate that audio buffer or other objects are not being released properly
  };
}

