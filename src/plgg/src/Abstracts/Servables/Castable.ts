import {
  Result,
  InvalidError,
  KindKeys1,
  Kind1,
  KindKeysDatum,
  KindDatum,
  Datum,
} from "plgg/index";

/**
 * Enables safe type casting for concrete types with no type parameters.
 */
export interface Castable<T> {
  /**
   * Safely casts unknown values to the target type with validation.
   */
  as: (value: unknown) => Result<T, InvalidError>;
}

/**
 * Enables safe type casting for single-parameter type constructors.
 */
export interface Castable1<
  KindKey extends KindKeys1,
> {
  /**
   * The kind identifier for this castable.
   */
  KindKey: KindKey;

  /**
   * Safely casts unknown values to the target type with validation.
   */
  as: <A>(
    value: unknown,
  ) => Result<Kind1<KindKey, A>, InvalidError>;
}

/**
 * Enables safe type casting for single-parameter type constructors with Datum constraints.
 */
export interface CastableDatum<
  KindKey extends KindKeysDatum,
> {
  /**
   * The kind identifier for this castable.
   */
  KindKey: KindKey;

  /**
   * Safely casts unknown values to the target type with validation.
   */
  as: <A extends Datum>(
    value: unknown,
  ) => Result<
    KindDatum<KindKey, A>,
    InvalidError
  >;
}
