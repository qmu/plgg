import {
  Box,
  Exception,
  InvalidError,
  SerializeError,
  DeserializeError,
  isSome,
  isObj,
  isBox,
} from "plgg/index";

/**
 * Union type representing domain errors in the application. Every arm carries a
 * literal `__tag` (and inherits a `content` getter from `BaseError`), so a
 * `PlggError` folds exhaustively through `match` — e.g.
 * `match(e)([pattern("InvalidError")(), …], …)` — while remaining a thrown
 * `Error` subclass.
 */
export type PlggError =
  | InvalidError
  | Exception
  | SerializeError
  | DeserializeError;

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
 * Reads a string message off an unknown `content` payload — `""` when absent.
 */
const messageOf = (content: unknown): string =>
  isObj(content) && "message" in content
    ? String(content.message)
    : "";

/**
 * A {@link Defect}'s real `Error`: its `cause` when that is an `Error` (origin
 * stack preserved), else a synthesized one carrying the defect message.
 */
const defectToError = (
  content: unknown,
): Error =>
  isObj(content) &&
  "cause" in content &&
  isSome(content.cause) &&
  content.cause.content instanceof Error
    ? content.cause.content
    : new Error(messageOf(content));

/**
 * A tagged error `Box` as an `Error`: a `Defect` yields its `cause` Error;
 * any other tagged error synthesizes `[Tag] message` (boundary stack — typed
 * errors are stackless by decision A).
 */
const boxToError = (
  e: Box<string, unknown>,
): Error =>
  e.__tag === "Defect"
    ? defectToError(e.content)
    : new Error(
        `[${e.__tag}] ${messageOf(e.content)}`,
      );

/**
 * Extracts or synthesizes a real `Error` from any value, for handing to
 * `Error`-expecting systems (loggers, framework handlers). A real `Error`
 * passes through; a tagged error `Box` is folded by {@link boxToError}.
 */
export const toError = (e: unknown): Error =>
  e instanceof Error
    ? e
    : isBox(e)
      ? boxToError(e)
      : new Error(String(e));

/**
 * Throws at an outer seam that demands a thrown `Error` (a framework boundary).
 * Domain code inward returns `err(...)`; this is the only sanctioned throw.
 */
export const panic = (e: unknown): never => {
  throw toError(e);
};

/**
 * Utility function for exhaustive checks and unreachable code paths.
 */
export function unreachable(): never {
  throw new Error("Supposed to be unreachable");
}
