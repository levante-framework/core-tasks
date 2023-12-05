export function stringToBoolean(str, defaultValue = false) {
    if (str === null || str === undefined) {
      return defaultValue;
    }
    return str.trim().toLowerCase() === "true";
  }