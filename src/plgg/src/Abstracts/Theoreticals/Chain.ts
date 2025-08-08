import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
  Apply1,
  Apply2,
  Apply3,
} from "plgg/index";

/**
 * Chain interface for single-parameter type constructors.
 * Provides monadic bind/flatMap operation. Extends Apply to inherit map and ap.
 *
 * Chain law:
 * - Associativity: chain(chain(m, f), g) === chain(m, x => chain(f(x), g))
 *
 * @template KindKey - The kind identifier for this chain
 */
export interface Chain1<KindKey extends KindKeys1> extends Apply1<KindKey> {
  /**
   * Monadic bind operation (also known as flatMap).
   * Applies a function that returns a wrapped value and flattens the result.
   * @param f - Function that takes unwrapped value and returns wrapped value
   * @returns Function that chains the operation
   */
  chain: <A, B>(
    f: (a: A) => Kind1<KindKey, B>,
  ) => (fa: Kind1<KindKey, A>) => Kind1<KindKey, B>;
}

/**
 * Chain interface for two-parameter type constructors.
 *
 * @template KindKey - The kind identifier for this chain
 */
export interface Chain2<KindKey extends KindKeys2> extends Apply2<KindKey> {
  /**
   * Monadic bind for two-parameter types.
   * @param f - Function that takes unwrapped value and returns wrapped value
   * @returns Function that chains the operation
   */
  chain: <A, B, C>(
    f: (a: A) => Kind2<KindKey, B, C>,
  ) => (fa: Kind2<KindKey, A, C>) => Kind2<KindKey, B, C>;
}

/**
 * Chain interface for three-parameter type constructors.
 *
 * @template KindKey - The kind identifier for this chain
 */
export interface Chain3<KindKey extends KindKeys3> extends Apply3<KindKey> {
  /**
   * Monadic bind for three-parameter types.
   * @param f - Function that takes unwrapped value and returns wrapped value
   * @returns Function that chains the operation
   */
  chain: <A, B, C, D>(
    f: (a: A) => Kind3<KindKey, B, C, D>,
  ) => (fa: Kind3<KindKey, A, C, D>) => Kind3<KindKey, B, C, D>;
}
