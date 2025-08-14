import {
  Result,
  InvalidError,
  KindKeys1,
  Kind1,
} from "plgg/index";

/**
 * Castable type class for safe type casting.
 * Used for concrete types with no type parameters.
 */
export interface Castable0<T> {
  /**
   * Safe casting operation that validates and converts unknown values to type T.
   */
  as: (value: unknown) => Result<T, InvalidError>;
}

/**
 * Castable type class for single-parameter type constructors.
 * Used for types like Option<T>, Ok<T>, Err<F>, etc.
 */
export interface Castable1<
  KindKey extends KindKeys1,
> {
  /**
   * The kind identifier for this castable.
   */
  KindKey: KindKey;

  /**
   * Safe casting operation that validates and converts unknown values.
   */
  as: <A>(
    value: unknown,
  ) => Result<Kind1<KindKey, A>, InvalidError>;
}