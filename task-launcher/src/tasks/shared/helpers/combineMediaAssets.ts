function combineMediaType(
  mediaAssets: MediaAssetsType,
  sharedMediaAssets: MediaAssetsType,
  mediaType: 'audio' | 'images' | 'video',
) {
  Object.keys(sharedMediaAssets[mediaType]).forEach((key) => {
    mediaAssets[mediaType][key] = sharedMediaAssets[mediaType][key];
  });

  return mediaAssets[mediaType];
}

export function combineMediaAssets(mediaAssets: MediaAssetsType, sharedMediaAssets: MediaAssetsType) {
  mediaAssets.audio = combineMediaType(mediaAssets, sharedMediaAssets, 'audio');
  mediaAssets.images = combineMediaType(mediaAssets, sharedMediaAssets, 'images');
  mediaAssets.video = combineMediaType(mediaAssets, sharedMediaAssets, 'video');

  return mediaAssets;
}
