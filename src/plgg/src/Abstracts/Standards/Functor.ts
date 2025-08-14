import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
} from "plgg/index";

/**
 * Functor interface for single-parameter type constructors.
 * Maps functions over wrapped values.
 */
export interface Functor1<KindKey extends KindKeys1> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Maps a function over the wrapped value.
   */
  map: <A, B>(f: (a: A) => B) => (fa: Kind1<KindKey, A>) => Kind1<KindKey, B>;
}

/**
 * Functor interface for two-parameter type constructors.
 * Maps over the first parameter while preserving the second.
 */
export interface Functor2<KindKey extends KindKeys2> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Maps a function over the first wrapped value.
   */
  map: <A, B, C>(
    f: (a: A) => B,
  ) => (fa: Kind2<KindKey, A, C>) => Kind2<KindKey, B, C>;
}

/**
 * Functor interface for three-parameter type constructors.
 * Maps over the first parameter while preserving others.
 */
export interface Functor3<KindKey extends KindKeys3> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Maps a function over the first wrapped value.
   */
  map: <A, B, C, D>(
    f: (a: A) => B,
  ) => (fa: Kind3<KindKey, A, C, D>) => Kind3<KindKey, B, C, D>;
}
