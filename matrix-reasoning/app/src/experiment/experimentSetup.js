import store from "store2";
import {
  createPreloadTrials,
  generateAssetObject,
  getDevice,
} from "@bdelab/roar-utils";
import assets from "../../assets.json";
import { Cat } from "@bdelab/jscat";
import { listObjects, createJsPsychTrials } from "./helperFunctions";

const bucketURI = "https://storage.googleapis.com/egma-math";

// export const mediaAssets = generateAssetObject(assets, bucketURI);
// export const preloadTrials = createPreloadTrials(assets, bucketURI).default;
export const isTouchScreen = getDevice() === "mobile";

export const mediaAssets = await listObjects('matrix-reasoning', {}, 'en')
export const preloadTrials = createJsPsychTrials(mediaAssets, ['lsm']).default

console.log({preloadTrials})

export let cat;

export const initializeCat = () => {
  cat = new Cat({
    method: "MLE",
    // minTheta: -6,
    // maxTheta: 6,
    itemSelect: store.session("itemSelect"),
  });
};
