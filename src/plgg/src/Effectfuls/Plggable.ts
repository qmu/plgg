import { Result } from "plgg/index";

/**
 * Type for values that may or may not be Promises.
 * Used for operations that can work with both sync and async values.
 * 
 * @template T - The wrapped value type
 * @example
 * const syncValue: MaybePromise<number> = 42;
 * const asyncValue: MaybePromise<number> = Promise.resolve(42);
 */
export type MaybePromise<T> = Promise<T> | T;

/**
 * Utility type for values that can be either direct values or Results.
 * Used in async operations where results might be wrapped or unwrapped.
 * 
 * @template T - The success type
 * @template U - The error type
 */
export type MaybeResult<T, U> = Result<T, U> | T;

/**
 * Async Result type for Plgg operations.
 * Represents values that can be synchronous or asynchronous,
 * and may be wrapped in Result types for error handling.
 * 
 * @template T - The success value type
 * @template U - The error type (defaults to Error)
 * @example
 * type AsyncNumber = Plggable<number>; // Promise<Result<number, Error>> | Result<number, Error> | number
 */
export type Plggable<T, U extends Error = Error> = T extends never
  ? never
  : MaybePromise<MaybeResult<T, U>>;

/**
 * Type guard to check if a value is a Promise.
 * Checks both instanceof Promise and thenable objects (duck typing).
 * 
 * @param value - Value to check
 * @returns True if the value is a Promise or thenable
 * @example
 * if (isPromise(value)) {
 *   const result = await value;
 * } else {
 *   const result = value;
 * }
 */
export const isPromise = <T>(value: MaybePromise<T>): value is Promise<T> =>
  value instanceof Promise ||
  (typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function");
