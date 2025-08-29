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
 * Enables folding structures into single values through reduction operations.
 */
export interface Foldable1<
  KindKey extends KindKeys1,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Performs right-associative fold of a structure.
   */
  foldr: <A, B>(
    f: (a: A, b: B) => B,
  ) => (
    initial: B,
  ) => (fa: Kind1<KindKey, A>) => B;
  /**
   * Performs left-associative fold of a structure.
   */
  foldl: <A, B>(
    f: (b: B, a: A) => B,
  ) => (
    initial: B,
  ) => (fa: Kind1<KindKey, A>) => B;
}

/**
 * Enables folding two-parameter type constructors over the first type parameter.
 */
export interface Foldable2<
  KindKey extends KindKeys2,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Performs right-associative fold for two-parameter types.
   */
  foldr: <A, B, C>(
    f: (a: A, b: B) => B,
  ) => (
    initial: B,
  ) => (fa: Kind2<KindKey, A, C>) => B;
  /**
   * Performs left-associative fold for two-parameter types.
   */
  foldl: <A, B, C>(
    f: (b: B, a: A) => B,
  ) => (
    initial: B,
  ) => (fa: Kind2<KindKey, A, C>) => B;
}

/**
 * Enables folding three-parameter type constructors over the first type parameter.
 */
export interface Foldable3<
  KindKey extends KindKeys3,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Performs right-associative fold for three-parameter types.
   */
  foldr: <A, B, C, D>(
    f: (a: A, b: B) => B,
  ) => (
    initial: B,
  ) => (fa: Kind3<KindKey, A, C, D>) => B;
  /**
   * Performs left-associative fold for three-parameter types.
   */
  foldl: <A, B, C, D>(
    f: (b: B, a: A) => B,
  ) => (
    initial: B,
  ) => (fa: Kind3<KindKey, A, C, D>) => B;
}

/**
 * Enables folding JsonSerializable structures into single values through reduction operations.
 */
export interface Foldable1JsonSerializable<
  KindKey extends KindKeys1JsonSerializable,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Performs right-associative fold of a JsonSerializable structure.
   */
  foldr: <A extends JsonSerializable, B>(
    f: (a: A, b: B) => B,
  ) => (
    initial: B,
  ) => (
    fa: Kind1JsonSerializable<KindKey, A>,
  ) => B;
  /**
   * Performs left-associative fold of a JsonSerializable structure.
   */
  foldl: <A extends JsonSerializable, B>(
    f: (b: B, a: A) => B,
  ) => (
    initial: B,
  ) => (
    fa: Kind1JsonSerializable<KindKey, A>,
  ) => B;
}
