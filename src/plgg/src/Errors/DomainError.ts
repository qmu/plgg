import { isSome, ValidationError, Exception, isObj } from "plgg/index";

/**
 * Union type representing domain errors in the application.
 * Can be either a ValidationError or an Exception.
 */
export type DomainError = ValidationError | Exception;

/*
 * Color helper functions
 */
const red = (text: string): string => `\x1b[31m${text}\x1b[0m`;
const gray = (text: string): string => `\x1b[90m${text}\x1b[0m`;

/**
 * Checks if a value is a DomainError.
 */
export const isDomainError = (value: unknown): value is DomainError =>
  isObj(value) && "__" in value && value.__ === "DomainError";

/**
 * Pretty prints a DomainError with nested error information.
 * Displays the error chain with colored output for better readability.
 */
export const printDomainError = (error: DomainError): void => {
  const collectErrors = (
    err: DomainError | Error,
  ): ReadonlyArray<DomainError | Error> =>
    isDomainError(err)
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
