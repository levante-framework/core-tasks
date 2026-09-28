/**
 * Convert a camelCase string to a kebab-case string.
 * @example 'memoryGameInstruct8Downex' -> 'memory-game-instruct-8-downex'
 */
export function camelToKebab(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .replace(/(\d)([a-zA-Z])/g, '$1-$2')
    .toLowerCase();
}
