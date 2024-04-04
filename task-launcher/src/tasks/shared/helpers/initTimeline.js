import { enterFullscreen } from '../trials';
import { makePid } from './makePID';
import { initAppTimer } from './index';

export const initTimeline = (config) => {
  const initialTimeline = [enterFullscreen];

  const beginningTimeline = {
    timeline: initialTimeline,
    on_timeline_finish: async () => {
      config.pid = config.pid || makePid();
      // console.log('pid: ', config.pid)
      await config.firekit.updateUser({
        assessmentPid: config.pid,
        ...config.userMetadata,
      });

      if (config.task === 'trog') {
        initAppTimer();
        //console.log('App Timer Initialized')
      }
    },
  };

  return beginningTimeline;
};
