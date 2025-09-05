/**
 * Simple, standalone code snippet for downloading images with webp preference and png fallback
 * This is a minimal implementation that you can copy and use anywhere
 */

/**
 * Downloads an image with webp preference and png fallback
 * @param imageName - Base name of the image (without extension)
 * @param baseUrl - Base URL where images are hosted
 * @returns Promise<string> - URL of the successfully downloaded image
 */
export async function downloadImageWithFallback(imageName: string, baseUrl: string): Promise<string> {
  // Try webp first
  const webpUrl = `${baseUrl}/${imageName}.webp`;
  try {
    const response = await fetch(webpUrl, { method: 'HEAD' });
    if (response.ok) {
      console.log(`Found webp version: ${webpUrl}`);
      return webpUrl;
    }
  } catch (error) {
    console.log(`Webp not available for ${imageName}, trying png...`);
  }
  
  // Fallback to png
  const pngUrl = `${baseUrl}/${imageName}.png`;
  try {
    const response = await fetch(pngUrl, { method: 'HEAD' });
    if (response.ok) {
      console.log(`Found png version: ${pngUrl}`);
      return pngUrl;
    }
  } catch (error) {
    console.error(`Neither webp nor png found for ${imageName}`);
    throw new Error(`No image found for ${imageName} in webp or png format`);
  }
  
  throw new Error(`No image found for ${imageName} in webp or png format`);
}

/**
 * Synchronous version that returns the preferred URL without checking existence
 * @param imageName - Base name of the image (without extension)
 * @param baseUrl - Base URL where images are hosted
 * @returns string - URL of the preferred image format
 */
export function getImageUrlWithFallback(imageName: string, baseUrl: string): string {
  // Return webp URL as preferred, browser will handle fallback if needed
  return `${baseUrl}/${imageName}.webp`;
}

/**
 * Batch download multiple images with fallback
 * @param imageNames - Array of base image names
 * @param baseUrl - Base URL where images are hosted
 * @returns Promise<Record<string, string>> - Object mapping image names to their URLs
 */
export async function downloadMultipleImagesWithFallback(
  imageNames: string[], 
  baseUrl: string
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  
  // Process images in parallel for better performance
  const downloadPromises = imageNames.map(async (imageName) => {
    try {
      const url = await downloadImageWithFallback(imageName, baseUrl);
      results[imageName] = url;
      return { imageName, url, success: true };
    } catch (error) {
      console.error(`Failed to download ${imageName}:`, error);
      return { imageName, url: '', success: false };
    }
  });
  
  await Promise.all(downloadPromises);
  return results;
}

/**
 * Example usage:
 * 
 * // Single image download
 * const imageUrl = await downloadImageWithFallback('myImage', 'https://example.com/images');
 * 
 * // Multiple images download
 * const imageUrls = await downloadMultipleImagesWithFallback(
 *   ['image1', 'image2', 'image3'], 
 *   'https://example.com/images'
 * );
 * 
 * // Get URL without checking existence
 * const imageUrl = getImageUrlWithFallback('myImage', 'https://example.com/images');
 */
