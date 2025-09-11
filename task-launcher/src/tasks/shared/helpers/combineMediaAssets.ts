function combineMediaType(sources: MediaAssetsType[], mediaType: 'audio' | 'images' | 'video') {
  const singleTypeMedia: Record<string, string> = {};

  for (let i = 0; i < sources.length; i++) {
    Object.keys(sources[i][mediaType]).forEach((key) => {
      singleTypeMedia[key] = sources[i][mediaType][key];
    });
  }

  return singleTypeMedia;
}

export function combineMediaAssets(sources: MediaAssetsType[]) {
  const combinedMediaAssets: MediaAssetsType = {
    images: {},
    audio: {},
    video: {},
  };

  combinedMediaAssets.audio = combineMediaType(sources, 'audio');
  combinedMediaAssets.images = combineMediaType(sources, 'images');
  combinedMediaAssets.video = combineMediaType(sources, 'video');

  return combinedMediaAssets;
}
