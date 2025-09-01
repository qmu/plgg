import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
  Kind1Datum,
  KindKeys1Datum,
  Datum,
} from "plgg/index";

/**
 * Provides the ability to wrap values in minimal context for single-parameter types.
 */
export interface Pointed1<
  KindKey extends KindKeys1,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Wraps a value in the minimal context (also known as pure or return).
   */
  of: <A>(a: A) => Kind1<KindKey, A>;
}

/**
 * Provides the ability to wrap values in minimal context for two-parameter types.
 */
export interface Pointed2<
  KindKey extends KindKeys2,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Wraps a value in the minimal context for two-parameter types.
   */
  of: <A = never, B = never>(
    a: A,
  ) => Kind2<KindKey, A, B>;
}

/**
 * Provides the ability to wrap values in minimal context for three-parameter types.
 */
export interface Pointed3<
  KindKey extends KindKeys3,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Wraps a value in the minimal context for three-parameter types.
   */
  of: <A = never, B = never, C = never>(
    a: A,
  ) => Kind3<KindKey, A, B, C>;
}

/**
 * Provides the ability to wrap Datum values in minimal context for single-parameter types.
 */
export interface Pointed1JsonSerializable<
  KindKey extends KindKeys1Datum,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Wraps a Datum value in the minimal context (also known as pure or return).
   */
  of: <A extends Datum>(
    a: A,
  ) => Kind1Datum<KindKey, A>;
}
