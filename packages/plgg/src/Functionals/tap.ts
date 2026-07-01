/**
 * Executes a side effect function with a value and returns the value unchanged.
 * Useful for logging, debugging, or other side effects in processing pipelines.
 */
export const tap =
  <T>(sideEffect: (value: T) => void) =>
  (value: T): T => {
    sideEffect(value);
    return value;
  };
