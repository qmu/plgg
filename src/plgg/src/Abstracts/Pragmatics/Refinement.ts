import { Result, InvalidError } from "plgg/index";

/**
 * Refinement type class for type validation and safe casting.
 * Provides both type guard predicates and safe casting operations.
 *
 * This type class is used to create type-safe validators that can:
 * - Check if a value matches a specific type (type guard)
 * - Safely cast unknown values to the target type with error handling
 *
 * @template T - The target type to refine to
 * @example
 * // String refinement instance
 * const strRefinement: Refinement<string> = {
 *   is: (value: unknown): value is string => typeof value === "string",
 *   as: (value: unknown): Result<string, InvalidError> =>
 *     typeof value === "string"
 *       ? ok(value)
 *       : err(new InvalidError({ message: "Value is not a string" }))
 * };
 */
export interface Refinement<T> {
  /**
   * Type guard predicate to check if a value is of type T.
   * @param value - Value to check
   * @returns True if value is of type T, false otherwise
   */
  is: (value: unknown) => value is T;

  /**
   * Safe casting operation that validates and converts unknown values to type T.
   * @param value - Value to validate and cast
   * @returns Result containing the typed value or an InvalidError
   */
  as: (value: unknown) => Result<T, InvalidError>;
}
