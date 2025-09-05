/**
 * Example usage of the getImageWithFallback utility
 * This demonstrates how to download images with webp preference and png fallback
 */

import { getImageWithFallback, getImageWithFallbackSync, prioritizeWebpImages } from './getImageWithFallback';
import { mediaAssets } from '../../..';

// Example 1: Using the async version with existence checking
export async function downloadImageWithFallback(imageName: string, baseUrl?: string): Promise<string> {
  try {
    const imageUrl = await getImageWithFallback(imageName, mediaAssets, baseUrl);
    console.log(`Downloading image: ${imageUrl}`);
    
    // You can now use this URL to download or display the image
    const response = await fetch(imageUrl);
    if (response.ok) {
      const blob = await response.blob();
      console.log(`Successfully downloaded ${imageName} (${blob.size} bytes)`);
      return imageUrl;
    } else {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error downloading image ${imageName}:`, error);
    throw error;
  }
}

// Example 2: Using the sync version for immediate URL construction
export function getImageUrlSync(imageName: string, baseUrl?: string): string {
  return getImageWithFallbackSync(imageName, mediaAssets, baseUrl);
}

// Example 3: Batch processing multiple images
export async function downloadMultipleImages(imageNames: string[], baseUrl?: string): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  
  // Process images in parallel for better performance
  const downloadPromises = imageNames.map(async (imageName) => {
    try {
      const url = await getImageWithFallback(imageName, mediaAssets, baseUrl);
      results[imageName] = url;
      return { imageName, url, success: true };
    } catch (error) {
      console.error(`Failed to get URL for ${imageName}:`, error);
      return { imageName, url: '', success: false };
    }
  });
  
  await Promise.all(downloadPromises);
  return results;
}

// Example 4: Enhanced image choices generation with webp preference
export function generateImageChoicesWithFallback(choices: string[], baseUrl?: string): string[] {
  return choices.map((choice) => {
    const imageUrl = getImageWithFallbackSync(choice, mediaAssets, baseUrl);
    return `<img src="${imageUrl}" alt="${choice}" loading="lazy" />`;
  });
}

// Example 5: Preload images with fallback
export async function preloadImagesWithFallback(imageNames: string[], baseUrl?: string): Promise<void> {
  const preloadPromises = imageNames.map(async (imageName) => {
    try {
      const imageUrl = await getImageWithFallback(imageName, mediaAssets, baseUrl);
      
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          console.log(`Preloaded: ${imageName}`);
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to preload: ${imageName}`);
          reject(new Error(`Failed to preload ${imageName}`));
        };
        img.src = imageUrl;
      });
    } catch (error) {
      console.error(`Error preloading ${imageName}:`, error);
      throw error;
    }
  });
  
  await Promise.allSettled(preloadPromises);
}

// Example 6: Integration with existing generateImageChoices function
export function enhancedGenerateImageChoices(choices: string[]): string[] {
  return generateImageChoicesWithFallback(choices);
}

// Example 7: Usage in a React component or similar
export function createImageElement(imageName: string, baseUrl?: string): HTMLImageElement {
  const img = document.createElement('img');
  img.alt = imageName;
  img.loading = 'lazy';
  
  // Set the source with fallback
  img.src = getImageWithFallbackSync(imageName, mediaAssets, baseUrl);
  
  // Add error handling
  img.onerror = () => {
    console.warn(`Failed to load image: ${imageName}`);
    // You could set a placeholder image here
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
  };
  
  return img;
}
