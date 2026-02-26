/**
 * Debug utility that logs a value and returns it unchanged.
 */
export const debug = <T>(value: T): T => {
  console.debug(value);
  return value;
};
