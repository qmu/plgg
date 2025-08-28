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
 * Enables folding record structures into single values through reduction operations.
 */
export interface Foldable1Rec<
  KindKey extends KindKeys1Rec,
> {
  /**
   * The kind key identifier.
   */
  readonly KindKey: KindKey;
  /**
   * Performs right-associative fold of a record structure.
   */
  foldr: <
    A extends Record<string, unknown>,
    B,
  >(
    f: (a: A, b: B) => B,
  ) => (
    initial: B,
  ) => (fa: Kind1Rec<KindKey, A>) => B;
  /**
   * Performs left-associative fold of a record structure.
   */
  foldl: <
    A extends Record<string, unknown>,
    B,
  >(
    f: (b: B, a: A) => B,
  ) => (
    initial: B,
  ) => (fa: Kind1Rec<KindKey, A>) => B;
}
