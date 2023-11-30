import store from "store2";
import { getDevice } from "@bdelab/roar-utils";
import { Cat } from "@bdelab/jscat";
import { initJsPsych } from "jspsych";
import i18next from "i18next";
import "../i18n/i18n";
import { getMediaAssets, createPreloadTrials } from "./shared/helpers";

// const bucketURI = `https://storage.googleapis.com/`;

export const mediaAssets = getMediaAssets(`task name here`, {}, 'en');
export const preloadTrials = createPreloadTrials(mediaAssets).default;
export const isTouchScreen = getDevice() === "mobile";

export let cat;

export const initializeCat = () => {
  cat = new Cat({
    method: "MLE",
    // minTheta: -6,
    // maxTheta: 6,
    itemSelect: store.session("itemSelect"),
  });
};


export const jsPsych = initJsPsych({
  show_progress_bar: true,
  auto_update_progress_bar: false,
  message_progress_bar: `${i18next.t("progressBar")}`,
});