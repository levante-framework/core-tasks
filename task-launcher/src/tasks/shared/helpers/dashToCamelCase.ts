export function dashToCamelCase(str: string) {
  return str.replace(/-([a-z])/gi, (_match, letter) => letter.toUpperCase());
}
