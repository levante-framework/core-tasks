import { startAppTimer } from './appTimer';
import { makePid } from './makePID';

export const initTimeline = (config: Record<string, any>, enterFullscreen: Record<string, any>) => {
  const initialTimeline = [enterFullscreen];

  const beginningTimeline = {
    timeline: initialTimeline,
    on_timeline_finish: async () => {
      if (config.firekit) {
        await config.firekit.updateUser({
          assessmentPid: config.pid || makePid(),
          ...config.userMetadata,
        });
      }

      startAppTimer(config.maxTime);
    },
  };

  return beginningTimeline;
};
