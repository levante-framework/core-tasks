import { makePid } from './makePID';
import { startAppTimer } from './appTimer';

export const initTimeline = (
  config: Record<string, any>,
  enterFullscreen: () => void,
  finishExperiment: () => void
) => {
  const initialTimeline = [enterFullscreen];

  const beginningTimeline = {
    timeline: initialTimeline,
    on_timeline_finish: async () => {
      await config.firekit.updateUser({
        assessmentPid: config.pid || makePid(),
        ...config.userMetadata,
      });

      startAppTimer(config.maxTime, finishExperiment);
    },
  };

  return beginningTimeline;
};
