import 'regenerator-runtime/runtime';
import { initTrialSaving, initTimeline } from '../shared/helpers';
import { jsPsych } from '../taskSetup';
import { enterFullscreen, exitFullscreen } from '../shared/trials';
import { finishTaskMessage, instructions, gpsInstructions, modeSelectInstructions } from './trials/instructions';
import { gpsCapture } from './trials/gpsCapture';
import { mapPicker } from './trials/mapPicker';
import { searchCityPostal } from './trials/searchCityPostal';
import { getLocationSelectionTaskConfig } from './helpers/config';
import { taskStore } from '../../taskStore';
import { clearLocationSelectionDraft } from './helpers/state';
import { waitScreen } from './trials/awaitPopulationInfo';

export default function buildLocationSelectionTimeline(config: Record<string, any>, _mediaAssets: MediaAssetsType) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen);
  const locationConfig = getLocationSelectionTaskConfig(config);

  taskStore('locationSelectionConfig', locationConfig);

  const gpsBlock = {
    timeline: [
      gpsInstructions, 
      gpsCapture
    ], 
    conditional_function: () => {
      return taskStore().locationSelectionMode === 'gps';
    }
  }

  const locationSelectionLoop = {
    timeline: [
      modeSelectInstructions,
      gpsBlock,
      mapPicker,
      searchCityPostal,
    ], 
    loop_function: () => {
      return taskStore().userWentBack;
    }
  }

  const timeline: any = [
    initialTimeline,
    ...instructions,
    locationSelectionLoop,
    waitScreen,
    finishTaskMessage,
  ];

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
