import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
  KindKeys1Rec,
  Kind1Rec,
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
 * Enables mapping functions over wrapped record values in single-parameter type constructors.
 */
export interface Functor1Rec<
  KindKey extends KindKeys1Rec,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Maps a function over the wrapped record value.
   */
  map: <
    A extends Record<string, unknown>,
    B extends Record<string, unknown>,
  >(
    f: (a: A) => B,
  ) => (
    fa: Kind1Rec<KindKey, A>,
  ) => Kind1Rec<KindKey, B>;
}
