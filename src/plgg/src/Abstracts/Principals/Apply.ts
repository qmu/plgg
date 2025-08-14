import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
  Functor1,
  Functor2,
  Functor3,
} from "plgg/index";

/**
 * Apply interface for single-parameter type constructors.
 * Extends Functor to provide the ability to apply wrapped functions to wrapped values.
 *
 * Apply law:
 * - Composition: ap(ap(map(compose, u), v), w) === ap(u, ap(v, w))
 *
 */
export interface Apply1<KindKey extends KindKeys1>
  extends Functor1<KindKey> {
  /**
   * Applies a wrapped function to a wrapped value.
   */
  ap: <A, B>(
    fab: Kind1<KindKey, (a: A) => B>,
  ) => (
    fa: Kind1<KindKey, A>,
  ) => Kind1<KindKey, B>;
}

/**
 * Apply interface for two-parameter type constructors.
 *
 */
export interface Apply2<KindKey extends KindKeys2>
  extends Functor2<KindKey> {
  /**
   * Applies a wrapped function to a wrapped value for two-parameter types.
   */
  ap: <A, B, C>(
    fab: Kind2<KindKey, (a: A) => B, C>,
  ) => (
    fa: Kind2<KindKey, A, C>,
  ) => Kind2<KindKey, B, C>;
}

/**
 * Apply interface for three-parameter type constructors.
 *
 */
export interface Apply3<KindKey extends KindKeys3>
  extends Functor3<KindKey> {
  /**
   * Applies a wrapped function to a wrapped value for three-parameter types.
   */
  ap: <A, B, C, D>(
    fab: Kind3<KindKey, (a: A) => B, C, D>,
  ) => (
    fa: Kind3<KindKey, A, C, D>,
  ) => Kind3<KindKey, B, C, D>;
}
