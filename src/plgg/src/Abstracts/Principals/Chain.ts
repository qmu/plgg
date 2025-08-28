import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
  KindKeys1Rec,
  Kind1Rec,
  Apply1,
  Apply2,
  Apply3,
  Apply1Rec,
} from "plgg/index";

/**
 * Chain interface for single-parameter type constructors.
 * Provides monadic bind/flatMap operation extending Apply capabilities.
 */
export interface Chain1<KindKey extends KindKeys1>
  extends Apply1<KindKey> {
  /**
   * Monadic bind operation (also known as flatMap).
   * Applies a function that returns a wrapped value and flattens the result.
   */
  chain: <A, B>(
    f: (a: A) => Kind1<KindKey, B>,
  ) => (
    fa: Kind1<KindKey, A>,
  ) => Kind1<KindKey, B>;
}

/**
 * Chain interface for two-parameter type constructors.
 */
export interface Chain2<KindKey extends KindKeys2>
  extends Apply2<KindKey> {
  /**
   * Monadic bind for two-parameter types.
   */
  chain: <A, B, C>(
    f: (a: A) => Kind2<KindKey, B, C>,
  ) => (
    fa: Kind2<KindKey, A, C>,
  ) => Kind2<KindKey, B, C>;
}

/**
 * Chain interface for three-parameter type constructors.
 */
export interface Chain3<KindKey extends KindKeys3>
  extends Apply3<KindKey> {
  /**
   * Monadic bind for three-parameter types.
   */
  chain: <A, B, C, D>(
    f: (a: A) => Kind3<KindKey, B, C, D>,
  ) => (
    fa: Kind3<KindKey, A, C, D>,
  ) => Kind3<KindKey, B, C, D>;
}

/**
 * Chain interface for single-parameter record type constructors.
 * Provides monadic bind/flatMap operation for record values extending Apply1Rec capabilities.
 */
export interface Chain1Rec<
  KindKey extends KindKeys1Rec,
> extends Apply1Rec<KindKey> {
  /**
   * Monadic bind operation for record values (also known as flatMap).
   * Applies a function that returns a wrapped record value and flattens the result.
   */
  chain: <
    A extends Record<string, unknown>,
    B extends Record<string, unknown>,
  >(
    f: (a: A) => Kind1Rec<KindKey, B>,
  ) => (
    fa: Kind1Rec<KindKey, A>,
  ) => Kind1Rec<KindKey, B>;
}
