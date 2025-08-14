import {
  isSome,
  InvalidError,
  Exception,
  isObj,
} from "plgg/index";

/**
 * Union type representing domain errors in the application.
 * Can be either a InvalidError or an Exception.
 */
export type PlggError = InvalidError | Exception;

/*
 * Color helper functions
 */
const red = (text: string): string =>
  `\x1b[31m${text}\x1b[0m`;
const gray = (text: string): string =>
  `\x1b[90m${text}\x1b[0m`;

/**
 * Type guard to check if a value is a PlggError.
 */
export const isPlggError = (
  value: unknown,
): value is PlggError =>
  isObj(value) &&
  "__" in value &&
  value.__ === "PlggError";

/**
 * Pretty prints a PlggError with nested error information.
 */
export const printPlggError = (
  error: PlggError,
): void => {
  const collectErrors = (
    err: PlggError | Error,
  ): ReadonlyArray<PlggError | Error> =>
    isPlggError(err)
      ? isSome(err.parent)
        ? [
            err,
            ...collectErrors(err.parent.content),
          ]
        : [err]
      : [err];
  collectErrors(error).forEach((err, index) => {
    const loc =
      err.stack
        ?.split("\n")[1]
        ?.trim()
        .replace(/^at /, "") || "";
    const output =
      index === 0
        ? `${red(`[${err.constructor.name}]`)}: ${err.message}${loc ? ` ${gray(`at ${loc}`)}` : ""}`
        : ` - ${gray(`${err.constructor.name}`)}: ${err.message}${loc ? ` ${gray(`at ${loc}`)}` : ""}`;
    console.error(output);
  });
};

/**
 * Converts unknown error to Error instance.
 */
export const toError = (err: unknown): Error =>
  err instanceof Error
    ? err
    : new Error(String(err));

/**
 * Utility function for exhaustive checks and unreachable code paths.
 */
export function unreachable(): never {
  throw new Error("Supposed to be unreachable");
}
