import {
  KindKeys1,
  Kind1,
  KindKeys1JsonSerializable,
  Kind1JsonSerializable,
} from "plgg/index";

/**
 * Enables type validation for concrete types with no type parameters.
 */
export interface Refinable0<T> {
  /**
   * Type guard predicate to check if a value is of type T.
   */
  is: (value: unknown) => value is T;
}

/**
 * Enables type validation for single-parameter type constructors.
 */
export interface Refinable1<
  KindKey extends KindKeys1,
> {
  /**
   * The kind identifier for this refinable.
   */
  KindKey: KindKey;

  /**
   * Type guard predicate to check if a value is of the specified kind.
   */
  is: <A>(
    value: unknown,
  ) => value is Kind1<KindKey, A>;
}

export type Refinable1JsonSerializable<
  KindKey extends KindKeys1JsonSerializable,
> = {
  /**
   * The kind identifier for this refinable.
   */
  KindKey: KindKey;

  /**
   * Type guard predicate to check if a value is of the specified kind.
   */
  is: <A>(
    value: unknown,
  ) => value is Kind1JsonSerializable<KindKey, A>;
};
