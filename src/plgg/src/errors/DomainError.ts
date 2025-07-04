import { isSome, ValidationError, Exception, Obj } from "plgg/index";

export type t = ValidationError | Exception;

/*
 * Color helper functions
 */
const red = (text: string): string => `\x1b[31m${text}\x1b[0m`;
const gray = (text: string): string => `\x1b[90m${text}\x1b[0m`;

/**
 * Checks if a value is a DomainError.
 */
export const is = (value: unknown): value is t =>
  Obj.is(value) && "__" in value && value.__ === "DomainError";

/*
 * Pretty prints a DomainError with nested error information
 */
export const debug = (error: t): void => {
  const collectErrors = (err: t | Error): ReadonlyArray<t | Error> =>
    is(err)
      ? isSome(err.parent)
        ? [err, ...collectErrors(err.parent.value)]
        : [err]
      : [err];
  collectErrors(error).forEach((err, index) => {
    const loc = err.stack?.split("\n")[1]?.trim().replace(/^at /, "") || "";
    const output =
      index === 0
        ? `${red(`[${err.constructor.name}]`)}: ${err.message}${loc ? ` ${gray(`at ${loc}`)}` : ""}`
        : ` - ${gray(`${err.constructor.name}`)}: ${err.message}${loc ? ` ${gray(`at ${loc}`)}` : ""}`;
    console.error(output);
  });
};
