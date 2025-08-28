import {
  Result,
  InvalidError,
  KindKeys1,
  Kind1,
  KindKeys1Rec,
  Kind1Rec,
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

export interface Castable1Rec<
  KindKey extends KindKeys1Rec,
> {
  /**
   * The kind identifier for this castable.
   */
  KindKey: KindKey;

  /**
   * Safely casts unknown values to the target type with validation.
   */
  as: <A extends Record<string, unknown>>(
    value: unknown,
  ) => Result<Kind1Rec<KindKey, A>, InvalidError>;
}
