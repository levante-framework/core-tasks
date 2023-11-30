export const initTimeline = (config) => {
    const initialTimeline = [enterFullscreen];
  
    const beginningTimeline = {
      timeline: initialTimeline,
      on_timeline_finish: async () => {
        config.pid = config.pid || makePid();
        await config.firekit.updateUser({
          assessmentPid: config.pid,
          ...config.userMetadata,
        });
      },
    };
  
    return beginningTimeline;
  };
  