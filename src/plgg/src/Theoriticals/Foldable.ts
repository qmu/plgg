import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
} from "plgg/index";

/**
 * Foldable interface for single-parameter type constructors.
 * Provides the ability to fold/reduce structures to a single value.
 *
 * Foldable laws:
 * - foldr(f, z, []) === z
 * - foldr(f, z, [x]) === f(x, z)
 * - foldr(f, z, xs ++ ys) === foldr(f, foldr(f, z, ys), xs)
 *
 * @template KindKey - The kind identifier for this foldable
 * @example
 * // Array implements Foldable1
 * const arrayFoldable: Foldable1<"Arr"> = {
 *   KindKey: "Arr",
 *   foldr: <A, B>(f: (a: A, b: B) => B) => (initial: B) => (fa: Arr<A>) =>
 *     fa.reduceRight((acc, x) => f(x, acc), initial)
 * };
 */
export interface Foldable1<KindKey extends KindKeys1> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Right-associative fold of a structure.
   * @param f - Function to combine element with accumulator
   * @returns Function that takes initial value and returns folding function
   */
  foldr: <A, B>(
    f: (a: A, b: B) => B,
  ) => (initial: B) => (fa: Kind1<KindKey, A>) => B;
  /**
   * Left-associative fold of a structure.
   * @param f - Function to combine accumulator with element
   * @returns Function that takes initial value and returns folding function
   */
  foldl: <A, B>(
    f: (b: B, a: A) => B,
  ) => (initial: B) => (fa: Kind1<KindKey, A>) => B;
}

/**
 * Foldable interface for two-parameter type constructors.
 * Folds over the first type parameter while preserving the second.
 *
 * @template KindKey - The kind identifier for this foldable
 */
export interface Foldable2<KindKey extends KindKeys2> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Right-associative fold for two-parameter types.
   * @param f - Function to combine element with accumulator
   * @returns Function that takes initial value and returns folding function
   */
  foldr: <A, B, C>(
    f: (a: A, b: B) => B,
  ) => (initial: B) => (fa: Kind2<KindKey, A, C>) => B;
  /**
   * Left-associative fold for two-parameter types.
   * @param f - Function to combine accumulator with element
   * @returns Function that takes initial value and returns folding function
   */
  foldl: <A, B, C>(
    f: (b: B, a: A) => B,
  ) => (initial: B) => (fa: Kind2<KindKey, A, C>) => B;
}

/**
 * Foldable interface for three-parameter type constructors.
 * Folds over the first type parameter while preserving the second and third.
 *
 * @template KindKey - The kind identifier for this foldable
 */
export interface Foldable3<KindKey extends KindKeys3> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Right-associative fold for three-parameter types.
   * @param f - Function to combine element with accumulator
   * @returns Function that takes initial value and returns folding function
   */
  foldr: <A, B, C, D>(
    f: (a: A, b: B) => B,
  ) => (initial: B) => (fa: Kind3<KindKey, A, C, D>) => B;
  /**
   * Left-associative fold for three-parameter types.
   * @param f - Function to combine accumulator with element
   * @returns Function that takes initial value and returns folding function
   */
  foldl: <A, B, C, D>(
    f: (b: B, a: A) => B,
  ) => (initial: B) => (fa: Kind3<KindKey, A, C, D>) => B;
}