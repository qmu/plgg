import {
  Result,
  Str,
  ok,
  err,
  Defect,
  defect,
} from "plgg/index";

/**
 * Safely retrieves an environment variable.
 * Returns Ok with the value if found, Err if not found or if process.env is unavailable.
 * Safe to use in both server and client environments.
 */
export const env = (
  key: Str,
): Result<string, Defect> => {
  try {
    if (
      typeof process === "undefined" ||
      typeof process.env === "undefined"
    ) {
      return err(
        defect(
          `Environment variable "${key.content}" is not accessible (process.env unavailable)`,
        ),
      );
    }
    const value = process.env[key.content];
    if (value === undefined || value === "") {
      return err(
        defect(
          `Environment variable "${key.content}" is not set`,
        ),
      );
    }
    return ok(value);
  } catch {
    return err(
      defect(
        `Failed to access environment variable "${key.content}"`,
      ),
    );
  }
};
