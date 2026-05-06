// falls back to non gender specific audio key if gender specific audio key is not present
export function addAudioKeyFallbacks(layoutConfig: LayoutConfigType, mediaAssets: MediaAssetsType) {
    const fallbackValues: string[] = [];
    const fallbackDisplayValues: string[] = [];
    if (layoutConfig.isStaggered) {
        layoutConfig.response.values.forEach((value) => {
            if (
                (value.endsWith('-plural') || value.endsWith('-fem')) &&
                !mediaAssets.audio[value]
            ) {
                fallbackValues.push(value.replace('-plural', '').replace('-fem', ''));
            } else {
                fallbackValues.push(value);
            }
        });

        layoutConfig.response.displayValues.forEach((value) => {
            if (
                (value.endsWith('-plural') || value.endsWith('-fem')) &&
                !mediaAssets.audio[value]
            ) {
                fallbackDisplayValues.push(value.replace('-plural', '').replace('-fem', ''));
            } else {
                fallbackDisplayValues.push(value);
            }
        });

        let target = layoutConfig.response.target;
        if (
            (target.endsWith('-plural') || target.endsWith('-fem')) &&
            !mediaAssets.audio[target]
        ) {
            target = target.replace('-plural', '').replace('-fem', '');
        }
        
        layoutConfig.response.target = target;
        layoutConfig.response.values = fallbackValues; 
        layoutConfig.response.displayValues = fallbackDisplayValues;
    }

    return layoutConfig;
}
