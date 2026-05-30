import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
  Semigroup1,
  Semigroup2,
  Semigroup3,
} from "plgg/index";

/**
 * Extends Semigroup with an identity element for single-parameter type constructors.
 */
export interface Monoid1<
  KindKey extends KindKeys1,
> extends Semigroup1<KindKey> {
  /**
   * The identity element for the concat operation.
   */
  empty: <A>() => Kind1<KindKey, A>;
}

/**
 * Extends Semigroup with an identity element for two-parameter type constructors.
 */
export interface Monoid2<
  KindKey extends KindKeys2,
> extends Semigroup2<KindKey> {
  /**
   * The identity element for the concat operation for two-parameter types.
   */
  empty: <A = never, B = never>() => Kind2<
    KindKey,
    A,
    B
  >;
}

/**
 * Extends Semigroup with an identity element for three-parameter type constructors.
 */
export interface Monoid3<
  KindKey extends KindKeys3,
> extends Semigroup3<KindKey> {
  /**
   * The identity element for the concat operation for three-parameter types.
   */
  empty: <
    A = never,
    B = never,
    C = never,
  >() => Kind3<KindKey, A, B, C>;
}
