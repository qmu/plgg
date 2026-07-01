import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
} from "plgg/index";

/**
 * Provides associative binary operations for combining single-parameter types.
 */
export interface Semigroup1<
  KindKey extends KindKeys1,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Combines two values of the same type.
   */
  concat: <A>(
    fa: Kind1<KindKey, A>,
  ) => (
    fb: Kind1<KindKey, A>,
  ) => Kind1<KindKey, A>;
}

/**
 * Provides associative binary operations for combining two-parameter types.
 */
export interface Semigroup2<
  KindKey extends KindKeys2,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Combines two values of the same type for two-parameter types.
   */
  concat: <A, B>(
    fa: Kind2<KindKey, A, B>,
  ) => (
    fb: Kind2<KindKey, A, B>,
  ) => Kind2<KindKey, A, B>;
}

/**
 * Provides associative binary operations for combining three-parameter types.
 */
export interface Semigroup3<
  KindKey extends KindKeys3,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Combines two values of the same type for three-parameter types.
   */
  concat: <A, B, C>(
    fa: Kind3<KindKey, A, B, C>,
  ) => (
    fb: Kind3<KindKey, A, B, C>,
  ) => Kind3<KindKey, A, B, C>;
}
