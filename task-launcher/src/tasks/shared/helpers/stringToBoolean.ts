export function stringToBoolean(
  str: string | null | undefined, defaultValue: boolean = false
): boolean {
  if (str === null || str === undefined) {
    return defaultValue;
  }
  return str.trim().toLowerCase() === 'true';
}
