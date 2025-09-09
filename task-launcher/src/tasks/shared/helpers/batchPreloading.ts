import { camelize } from './camelize'; 
import { filterMedia } from './filterMedia';

export function batchMediaAssets(
  mediaAssets: MediaAssetsType, 
  batchList: StimulusType[][], 
  imageFields: string[], // fields of corpus where image assets are specified (varies by task)
  audioFields: string[] = ['audioFile'],
) {
  // organize media assets by block
  const batchedMediaAssets: MediaAssetsType[] = []; 
  
  // list names of all assets found in particular block of corpus
  const batchedAssetNames: {
    audio: string[];
    images: string[];
  } = {
    audio: [],
    images: [],
  };

  // get all media assets from each block into mediaAssetsPerBlock
  batchList.forEach((currBatchTrials) => {
    let blockAudio: string[] = [];
    currBatchTrials.forEach(trial => {
      audioFields.forEach((string: string) => {
        const trialField = trial[string as 'audioFile' |'distractors'];

        if (trialField !== undefined && trialField.length !== 0) {
          if ((typeof trialField) === "string")  {
            blockAudio.push(camelize(trialField));
          } else {
            blockAudio.push(...(trialField as string[]).map((audioFile: string) => camelize(audioFile)));
          }
        }

      });
    })

    let blockImages: string[] = []; 
    currBatchTrials.forEach(trial => {
      imageFields.forEach((string) => {
        const trialField = trial[string as 'image' | 'distractors'| 'answer' | 'item'] as any;

        if (trialField !== undefined && trialField.length !== 0) {
          if ((typeof trialField) === "string")  {
            blockImages.push(camelize(trialField));
          } else {
            blockImages.push(...(trialField as string[]).map((image: string) => camelize(image)));
          }
        }
      })
    })

    // remove duplicate images from current block
    blockImages = [...new Set(blockImages)];
    
    // remove duplicate assets already required in other blocks
    blockImages = blockImages.filter((asset) => {
      return !batchedAssetNames.images.includes(asset);
    });
    blockAudio = blockAudio.filter((asset) => {
      return !batchedAssetNames.audio.includes(asset);
    });

    batchedAssetNames.audio.push(...blockAudio);
    batchedAssetNames.images.push(...blockImages);

    const blockAssets = filterMedia(mediaAssets, blockImages, blockAudio, []); 
    batchedMediaAssets.push(blockAssets);
  });

  return {batchedMediaAssets, batchedAssetNames}
}

// separates a corpus into batches of a certain size for asset preloading
export function batchTrials(corpus: StimulusType[], batchSize: number) {
  const finalBatchList: StimulusType[][] = []; 
  let currTrialIndex = 0; 
  let currBatchIndex = 0;

  corpus.forEach((trial: StimulusType) => {
    if (currTrialIndex === 0) {
      finalBatchList.push([trial]);
    } else {
      finalBatchList[currBatchIndex].push(trial);
    }
    
    currTrialIndex ++; 
    
    if (currTrialIndex >= batchSize) {
      currTrialIndex = 0; 
      currBatchIndex ++;
    }
  })

  return finalBatchList; 
}
  



