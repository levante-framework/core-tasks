import 'regenerator-runtime/runtime';
import { initTrialSaving, initTimeline } from '../shared/helpers';
import { jsPsych } from '../taskSetup';
import { enterFullscreen, exitFullscreen, finishExperiment, taskFinished } from '../shared/trials';
import { instructions } from './trials/instructions';
import { gpsCapture } from './trials/gpsCapture';
import { mapPicker } from './trials/mapPicker';
import { searchCityPostal } from './trials/searchCityPostal';
import { reviewAndConfirm } from './trials/reviewAndConfirm';
import { getLocationSelectionTaskConfig } from './helpers/config';
import { taskStore } from '../../taskStore';
import { clearLocationSelectionDraft } from './helpers/state';

export default function buildLocationSelectionTimeline(config: Record<string, any>, _mediaAssets: MediaAssetsType) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);
  const locationConfig = getLocationSelectionTaskConfig(config);

  taskStore('locationSelectionConfig', locationConfig);
  taskStore('locationSelectionMode', null);
  taskStore('locationSelectionLastStep', null);
  taskStore('locationSelectionCommitPreview', null);
  taskStore('locationSelectionPendingSuggestion', null);
  taskStore('locationSelectionPendingCountry', null);
  clearLocationSelectionDraft();

  const timeline: Record<string, any>[] = [
    initialTimeline,
    ...instructions,
    gpsCapture,
    mapPicker,
    searchCityPostal,
    reviewAndConfirm,
  ];

  timeline.push(taskFinished('taskFinished'));
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
