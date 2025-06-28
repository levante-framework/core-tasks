/**
 * Check if the code is running in a browser environment
 * Used to conditionally initialize Firebase Performance which requires window
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && !!window.document;
}; 