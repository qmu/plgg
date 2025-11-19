import {
  Result,
  pipe,
  tryCatch,
  toError,
} from "plgg/index";

/**
 * Decodes JSON string or Buffer into unknown value, returning Result.
 */
export const jsonDecode = (
  json: string | Buffer,
): Result<unknown, Error> =>
  pipe(
    json,
    tryCatch(
      (json) =>
        JSON.parse(
          Buffer.isBuffer(json)
            ? json.toString("utf-8")
            : json,
        ),
      (error) => toError(error),
    ),
  );
