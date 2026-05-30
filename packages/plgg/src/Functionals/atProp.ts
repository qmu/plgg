import {
  Result,
  InvalidError,
  ok,
  err,
} from "plgg/index";

/**
 * Accesses a property from an object in a proc-friendly way.
 * Returns Ok with the property value or Err if the property doesn't exist.
 */
export const atProp =
  <K extends string>(key: K) =>
  (
    obj: unknown,
  ): Result<unknown, InvalidError> => {
    if (
      typeof obj !== "object" ||
      obj === null ||
      !(key in obj)
    ) {
      return err(
        new InvalidError({
          message: `Cannot access property '${key}'`,
        }),
      );
    }
    return ok(
      (obj as Record<string, unknown>)[key],
    );
  };
