import { enterFullscreen } from '../trials';
import { makePid } from './makePID';
import { initAppTimer } from './index';
import { pid } from '../../../../serve/serve';

export const initTimeline = (config) => {
  const initialTimeline = [enterFullscreen];

  const beginningTimeline = {
    timeline: initialTimeline,
    on_timeline_finish: async () => {
      config.pid = pid || makePid();
      await config.firekit.updateUser({
        assessmentPid: config.pid || urlParam,
        ...config.userMetadata,
      });

      if (config.task === 'trog') {
        initAppTimer();
      }
    },
  };

  return beginningTimeline;
};
