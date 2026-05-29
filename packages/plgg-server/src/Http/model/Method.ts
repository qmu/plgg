/**
 * HTTP request methods recognized by the router.
 */
export type Method =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

/**
 * All recognized methods in a stable order.
 */
export const METHODS: ReadonlyArray<Method> = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

import {
  Result,
  InvalidError,
  ok,
  err,
} from "plgg";

/**
 * Type guard for recognized HTTP methods.
 */
export const isMethod = (
  value: unknown,
): value is Method =>
  typeof value === "string" &&
  METHODS.some((m) => m === value);

/**
 * Parses an unknown value into a {@link Method}, plgg-style.
 */
export const asMethod = (
  value: unknown,
): Result<Method, InvalidError> =>
  isMethod(value)
    ? ok(value)
    : err(
        new InvalidError({
          message: `${String(value)} is not a supported HTTP method`,
        }),
      );
