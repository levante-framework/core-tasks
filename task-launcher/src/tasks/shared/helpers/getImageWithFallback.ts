/**
 * Utility function to get image URL with webp preference and png fallback
 * @param baseFileName - The base filename without extension (e.g., "myImage")
 * @param mediaAssets - The media assets object containing image URLs
 * @param baseUrl - Optional base URL for constructing fallback URLs
 * @returns Promise<string> - The URL of the preferred image format
 */
export async function getImageWithFallback(
  baseFileName: string,
  mediaAssets: { images: Record<string, string> },
  baseUrl?: string
): Promise<string> {
  const camelCaseFileName = baseFileName.replace(/[-_]/g, '').replace(/\s+/g, '');
  
  // First, try to find webp version in mediaAssets
  const webpKey = `${camelCaseFileName}Webp`;
  if (mediaAssets.images[webpKey]) {
    return mediaAssets.images[webpKey];
  }
  
  // If webp not found, try the original filename (might be webp)
  if (mediaAssets.images[camelCaseFileName]) {
    const url = mediaAssets.images[camelCaseFileName];
    // Check if it's already webp format
    if (url.toLowerCase().includes('.webp')) {
      return url;
    }
  }
  
  // Try to construct webp URL and check if it exists
  if (baseUrl) {
    const webpUrl = `${baseUrl}/${baseFileName}.webp`;
    try {
      const response = await fetch(webpUrl, { method: 'HEAD' });
      if (response.ok) {
        return webpUrl;
      }
    } catch (error) {
      // Silently continue to png fallback
    }
  }
  
  // Fallback to png version
  const pngKey = `${camelCaseFileName}Png`;
  if (mediaAssets.images[pngKey]) {
    return mediaAssets.images[pngKey];
  }
  
  // Try original filename (might be png)
  if (mediaAssets.images[camelCaseFileName]) {
    return mediaAssets.images[camelCaseFileName];
  }
  
  // Try to construct png URL
  if (baseUrl) {
    const pngUrl = `${baseUrl}/${baseFileName}.png`;
    try {
      const response = await fetch(pngUrl, { method: 'HEAD' });
      if (response.ok) {
        return pngUrl;
      }
    } catch (error) {
      // If png also fails, return the constructed URL anyway
      return pngUrl;
    }
  }
  
  // Last resort: return empty string or throw error
  throw new Error(`No image found for ${baseFileName} in webp or png format`);
}

/**
 * Synchronous version that returns the best available URL without checking existence
 * @param baseFileName - The base filename without extension
 * @param mediaAssets - The media assets object containing image URLs
 * @param baseUrl - Optional base URL for constructing fallback URLs
 * @returns string - The URL of the preferred image format
 */
export function getImageWithFallbackSync(
  baseFileName: string,
  mediaAssets: { images: Record<string, string> },
  baseUrl?: string
): string {
  const camelCaseFileName = baseFileName.replace(/[-_]/g, '').replace(/\s+/g, '');
  
  // First, try to find webp version in mediaAssets
  const webpKey = `${camelCaseFileName}Webp`;
  if (mediaAssets.images[webpKey]) {
    return mediaAssets.images[webpKey];
  }
  
  // If webp not found, try the original filename (might be webp)
  if (mediaAssets.images[camelCaseFileName]) {
    const url = mediaAssets.images[camelCaseFileName];
    // Check if it's already webp format
    if (url.toLowerCase().includes('.webp')) {
      return url;
    }
  }
  
  // Try to construct webp URL (preferred)
  if (baseUrl) {
    return `${baseUrl}/${baseFileName}.webp`;
  }
  
  // Fallback to png version in mediaAssets
  const pngKey = `${camelCaseFileName}Png`;
  if (mediaAssets.images[pngKey]) {
    return mediaAssets.images[pngKey];
  }
  
  // Try original filename (might be png)
  if (mediaAssets.images[camelCaseFileName]) {
    return mediaAssets.images[camelCaseFileName];
  }
  
  // Fallback to png URL
  if (baseUrl) {
    return `${baseUrl}/${baseFileName}.png`;
  }
  
  // Last resort: return empty string
  return '';
}

/**
 * Enhanced version of getMediaAssets that prioritizes webp over png
 * This modifies the existing getMediaAssets function to prefer webp format
 */
export function prioritizeWebpImages(categorizedObjects: { images: Record<string, string> }) {
  const imageEntries = Object.entries(categorizedObjects.images);
  const prioritizedImages: Record<string, string> = {};
  
  // Group images by base name (without extension)
  const imageGroups: Record<string, { webp?: string; png?: string; other?: string }> = {};
  
  imageEntries.forEach(([key, url]) => {
    const baseName = key.replace(/(Webp|Png|Jpg|Jpeg|Gif)$/i, '');
    const extension = key.match(/(Webp|Png|Jpg|Jpeg|Gif)$/i)?.[0]?.toLowerCase();
    
    if (!imageGroups[baseName]) {
      imageGroups[baseName] = {};
    }
    
    if (extension === 'webp') {
      imageGroups[baseName].webp = url;
    } else if (extension === 'png') {
      imageGroups[baseName].png = url;
    } else {
      imageGroups[baseName].other = url;
    }
  });
  
  // Prioritize webp, fallback to png, then other formats
  Object.entries(imageGroups).forEach(([baseName, formats]) => {
    const preferredUrl = formats.webp || formats.png || formats.other;
    if (preferredUrl) {
      prioritizedImages[baseName] = preferredUrl;
    }
  });
  
  return prioritizedImages;
}
