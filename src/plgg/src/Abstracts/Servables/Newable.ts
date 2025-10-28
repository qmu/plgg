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
export interface Newable<T, Arg = unknown> {
  /**
   * Constructs a new instance of type T from an argument.
   * When Arg is unknown, the constructor should validate and transform the input.
   */
  new: (arg: Arg) => T;
}

/**
 * Enables construction of values for single-parameter type constructors.
 */
export interface Newable1<
  KindKey extends KindKeys1,
  Arg,
> {
  /**
   * The kind identifier for this newable.
   */
  KindKey: KindKey;

  /**
   * Constructs a new instance of the specified kind.
   */
  new: <A>(arg: Arg) => Kind1<KindKey, A>;
}

/**
 * Enables construction of values for single-parameter type constructors with Datum constraints.
 */
export interface NewableDatum<
  KindKey extends KindKeysDatum,
  Arg,
> {
  /**
   * The kind identifier for this newable.
   */
  KindKey: KindKey;

  /**
   * Constructs a new instance of the specified kind.
   */
  new: <A extends Datum>(
    arg: Arg,
  ) => KindDatum<KindKey, A>;
}
