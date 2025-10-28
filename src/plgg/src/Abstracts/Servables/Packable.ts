import {
  KindKeys1,
  Kind1,
  KindKeysDatum,
  KindDatum,
  Datum,
} from "plgg/index";

/**
 * Enables construction of values for concrete types with no type parameters.
 */
export interface Packable<T, Arg = unknown> {
  /**
   * Constructs a new instance of type T from an argument.
   * When Arg is unknown, the constructor should validate and transform the input.
   */
  packAs: (arg: Arg) => T;
}

/**
 * Enables construction of values for single-parameter type constructors.
 */
export interface Packable1<
  KindKey extends KindKeys1,
  Arg,
> {
  /**
   * The kind identifier for this packable.
   */
  KindKey: KindKey;

  /**
   * Constructs a new instance of the specified kind.
   */
  packAs: <A>(arg: Arg) => Kind1<KindKey, A>;
}

/**
 * Enables construction of values for single-parameter type constructors with Datum constraints.
 */
export interface PackableDatum<
  KindKey extends KindKeysDatum,
  Arg,
> {
  /**
   * The kind identifier for this packable.
   */
  KindKey: KindKey;

  /**
   * Constructs a new instance of the specified kind.
   */
  packAs: <A extends Datum>(
    arg: Arg,
  ) => KindDatum<KindKey, A>;
}
