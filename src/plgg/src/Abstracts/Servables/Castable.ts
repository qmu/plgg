import {
  Result,
  InvalidError,
  KindKeys1,
  Kind1,
  KindKeys1Datum,
  Kind1Datum,
  Datum,
} from "plgg/index";

/**
 * Enables safe type casting for concrete types with no type parameters.
 */
export interface Castable0<T> {
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

export interface Castable1JsonSerializable<
  KindKey extends KindKeys1Datum,
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
    Kind1Datum<KindKey, A>,
    InvalidError
  >;
}
