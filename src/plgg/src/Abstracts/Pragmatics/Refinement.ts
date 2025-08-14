import { Result, InvalidError } from "plgg/index";

/**
 * Refinement type class for type validation and safe casting.
 */
export interface Refinement<T> {
  /**
   * Type guard predicate to check if a value is of type T.
   */
  is: (value: unknown) => value is T;

  /**
   * Safe casting operation that validates and converts unknown values to type T.
   */
  as: (value: unknown) => Result<T, InvalidError>;
}
