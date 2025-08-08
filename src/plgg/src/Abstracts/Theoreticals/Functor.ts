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
 * Provides the ability to map functions over wrapped values.
 *
 * Mathematical laws:
 * - Identity: map(id) === id
 * - Composition: map(g . f) === map(g) . map(f)
 *
 * @template KindKey - The kind identifier for this functor
 * @example
 * // Option implements Functor1
 * const optionFunctor: Functor1<"Option"> = {
 *   KindKey: "Option",
 *   map: <A, B>(f: (a: A) => B) => (opt: Option<A>) =>
 *     isSome(opt) ? some(f(opt.content)) : none()
 * };
 */
export interface Functor1<KindKey extends KindKeys1> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Maps a function over the wrapped value.
   * @param f - Function to apply to the wrapped value
   * @returns Function that applies f to wrapped values
   */
  map: <A, B>(f: (a: A) => B) => (fa: Kind1<KindKey, A>) => Kind1<KindKey, B>;
}

/**
 * Functor interface for two-parameter type constructors.
 * Maps over the first type parameter while preserving the second.
 *
 * @template KindKey - The kind identifier for this functor
 */
export interface Functor2<KindKey extends KindKeys2> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Maps a function over the first wrapped value.
   * @param f - Function to apply to the first wrapped value
   * @returns Function that applies f to the first parameter of wrapped values
   */
  map: <A, B, C>(
    f: (a: A) => B,
  ) => (fa: Kind2<KindKey, A, C>) => Kind2<KindKey, B, C>;
}

/**
 * Functor interface for three-parameter type constructors.
 * Maps over the first type parameter while preserving the second and third.
 *
 * @template KindKey - The kind identifier for this functor
 */
export interface Functor3<KindKey extends KindKeys3> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Maps a function over the first wrapped value.
   * @param f - Function to apply to the first wrapped value
   * @returns Function that applies f to the first parameter of wrapped values
   */
  map: <A, B, C, D>(
    f: (a: A) => B,
  ) => (fa: Kind3<KindKey, A, C, D>) => Kind3<KindKey, B, C, D>;
}
