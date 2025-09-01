import {
  KindKeys1,
  Kind1,
  KindKeysDatum,
  KindDatum,
  Datum,
} from "plgg/index";

/**
 * Enables type validation for concrete types with no type parameters.
 */
export interface Refinable<T> {
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

/**
 * Enables type validation for single-parameter type constructors with Datum constraints.
 */
export type RefinableDatum<
  KindKey extends KindKeysDatum,
> = {
  /**
   * The kind identifier for this refinable.
   */
  KindKey: KindKey;

  /**
   * Type guard predicate to check if a value is of the specified kind.
   */
  is: <A extends Datum>(
    value: unknown,
  ) => value is KindDatum<KindKey, A>;
};
