import {
  Result,
  InvalidError,
  KindKeys1,
  Kind1,
} from "plgg/index";

/**
 * Base Refinement type class for type validation and safe casting.
 * Used for concrete types with no type parameters.
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

/**
 * Refinement type class for single-parameter type constructors.
 * Used for types like Option<T>, Ok<T>, Err<F>, etc.
 */
export interface Refinement1<
  KindKey extends KindKeys1,
> {
  /**
   * The kind identifier for this refinement.
   */
  KindKey: KindKey;

  /**
   * Type guard predicate to check if a value is of the specified kind.
   */
  is: <A>(value: unknown) => value is Kind1<KindKey, A>;

  /**
   * Safe casting operation that validates and converts unknown values.
   */
  as: <A>(
    value: unknown,
  ) => Result<Kind1<KindKey, A>, InvalidError>;
}
