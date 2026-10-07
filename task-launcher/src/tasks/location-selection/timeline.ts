import 'regenerator-runtime/runtime';
import { taskStore } from '../../taskStore';
import { initTimeline, initTrialSaving } from '../shared/helpers';
import { enterFullscreen, exitFullscreen } from '../shared/trials';
import { jsPsych } from '../taskSetup';
import { initLocationPersistence } from './helpers/persistLocation';
import { initPopulationApi } from './helpers/populationApi';
import { waitScreen } from './trials/awaitPopulationInfo';
import { gpsCapture } from './trials/gpsCapture';
import {
  finishTaskMessage,
  gpsInstructions,
  instructions,
  locationWriteError,
  modeSelectInstructions,
} from './trials/instructions';
import { mapPicker } from './trials/mapPicker';
import { searchCityPostal } from './trials/searchCityPostal';

export default function buildLocationSelectionTimeline(config: Record<string, any>, _mediaAssets: MediaAssetsType) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen);
  initLocationPersistence(config);
  initPopulationApi(config);

  const gpsBlock = {
    timeline: [gpsInstructions, gpsCapture],
    conditional_function: () => {
      return taskStore().locationSelectionMode === 'gps';
    },
  };

  const locationWriteErrorBlock = {
    timeline: [locationWriteError],
    conditional_function: () => {
      const run = taskStore().locationWriteFailed;
      if (run) {
        taskStore('locationWriteFailed', false);
      }
      return run;
    },
  };

  const locationSelectionLoop = {
    timeline: [modeSelectInstructions, gpsBlock, mapPicker, searchCityPostal, waitScreen, locationWriteErrorBlock],
    loop_function: () => {
      return taskStore().userWentBack;
    },
  };

  const timeline: any = [initialTimeline, ...instructions, locationSelectionLoop, finishTaskMessage];

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
