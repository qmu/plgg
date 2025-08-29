import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
  Kind1JsonSerializable,
  KindKeys1JsonSerializable,
  JsonSerializable,
} from "plgg/index";

/**
 * Enables mapping functions over wrapped values in single-parameter type constructors.
 */
export interface Functor1<
  KindKey extends KindKeys1,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Maps a function over the wrapped value.
   */
  map: <A, B>(
    f: (a: A) => B,
  ) => (
    fa: Kind1<KindKey, A>,
  ) => Kind1<KindKey, B>;
}

/**
 * Enables mapping over the first parameter in two-parameter type constructors.
 */
export interface Functor2<
  KindKey extends KindKeys2,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Maps a function over the first wrapped value.
   */
  map: <A, B, C>(
    f: (a: A) => B,
  ) => (
    fa: Kind2<KindKey, A, C>,
  ) => Kind2<KindKey, B, C>;
}

/**
 * Enables mapping over the first parameter in three-parameter type constructors.
 */
export interface Functor3<
  KindKey extends KindKeys3,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Maps a function over the first wrapped value.
   */
  map: <A, B, C, D>(
    f: (a: A) => B,
  ) => (
    fa: Kind3<KindKey, A, C, D>,
  ) => Kind3<KindKey, B, C, D>;
}

/**
 * Enables mapping functions over wrapped JsonSerializable values in single-parameter type constructors.
 */
export interface Functor1JsonSerializable<
  KindKey extends KindKeys1JsonSerializable,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Maps a function over the wrapped JsonSerializable value.
   */
  map: <
    A extends JsonSerializable,
    B extends JsonSerializable,
  >(
    f: (a: A) => B,
  ) => (
    fa: Kind1JsonSerializable<KindKey, A>,
  ) => Kind1JsonSerializable<KindKey, B>;
}
