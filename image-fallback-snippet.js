/**
 * Simple JavaScript code snippet for downloading images with webp preference and png fallback
 * Copy and paste this code wherever you need it
 */

/**
 * Downloads an image with webp preference and png fallback
 * @param {string} imageName - Base name of the image (without extension)
 * @param {string} baseUrl - Base URL where images are hosted
 * @returns {Promise<string>} - URL of the successfully downloaded image
 */
async function downloadImageWithFallback(imageName, baseUrl) {
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
 * @param {string} imageName - Base name of the image (without extension)
 * @param {string} baseUrl - Base URL where images are hosted
 * @returns {string} - URL of the preferred image format
 */
function getImageUrlWithFallback(imageName, baseUrl) {
  // Return webp URL as preferred, browser will handle fallback if needed
  return `${baseUrl}/${imageName}.webp`;
}

/**
 * Batch download multiple images with fallback
 * @param {string[]} imageNames - Array of base image names
 * @param {string} baseUrl - Base URL where images are hosted
 * @returns {Promise<Object>} - Object mapping image names to their URLs
 */
async function downloadMultipleImagesWithFallback(imageNames, baseUrl) {
  const results = {};
  
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
 * Create an HTML image element with fallback
 * @param {string} imageName - Base name of the image
 * @param {string} baseUrl - Base URL where images are hosted
 * @returns {HTMLImageElement} - Image element with fallback handling
 */
function createImageWithFallback(imageName, baseUrl) {
  const img = document.createElement('img');
  img.alt = imageName;
  img.loading = 'lazy';
  
  // Set webp as preferred source
  img.src = `${baseUrl}/${imageName}.webp`;
  
  // Add error handling for fallback to png
  img.onerror = () => {
    console.log(`Webp failed for ${imageName}, trying png...`);
    img.src = `${baseUrl}/${imageName}.png`;
    
    // If png also fails, show placeholder
    img.onerror = () => {
      console.warn(`Both webp and png failed for ${imageName}`);
      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
    };
  };
  
  return img;
}

// Example usage:
/*
// Single image download
const imageUrl = await downloadImageWithFallback('myImage', 'https://example.com/images');

// Multiple images download
const imageUrls = await downloadMultipleImagesWithFallback(
  ['image1', 'image2', 'image3'], 
  'https://example.com/images'
);

// Get URL without checking existence
const imageUrl = getImageUrlWithFallback('myImage', 'https://example.com/images');

// Create image element with automatic fallback
const imgElement = createImageWithFallback('myImage', 'https://example.com/images');
document.body.appendChild(imgElement);
*/
