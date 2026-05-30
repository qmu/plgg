import {
  Result,
  ok,
  err,
  Exception,
} from "plgg/index";

/**
 * Safely retrieves an environment variable.
 * Returns Ok with the value if found, Err if not found or if process.env is unavailable.
 * Safe to use in both server and client environments.
 */
export const env = (
  key: string,
): Result<string, Exception> => {
  try {
    if (
      typeof process === "undefined" ||
      typeof process.env === "undefined"
    ) {
      return err(
        new Exception(
          `Environment variable "${key}" is not accessible (process.env unavailable)`,
        ),
      );
    }
    const value = process.env[key];
    if (value === undefined || value === "") {
      return err(
        new Exception(
          `Environment variable "${key}" is not set`,
        ),
      );
    }
    return ok(value);
  } catch {
    return err(
      new Exception(
        `Failed to access environment variable "${key}"`,
      ),
    );
  }
};
