import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
} from "plgg/index";

/**
 * Semigroup interface for single-parameter type constructors.
 * Provides an associative binary operation for combining values.
 *
 * Semigroup law:
 * - Associativity: concat(concat(a, b), c) === concat(a, concat(b, c))
 *
 * @template KindKey - The kind identifier for this semigroup
 * @example
 * // Array implements Semigroup1
 * const arraySemigroup: Semigroup1<"Arr"> = {
 *   KindKey: "Arr",
 *   concat: <A>(fa: Arr<A>) => (fb: Arr<A>) => [...fa, ...fb]
 * };
 */
export interface Semigroup1<KindKey extends KindKeys1> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Combines two values of the same type.
   * @param fa - First value to combine
   * @returns Function that takes second value and returns combined result
   */
  concat: <A>(fa: Kind1<KindKey, A>) => (fb: Kind1<KindKey, A>) => Kind1<KindKey, A>;
}

/**
 * Semigroup interface for two-parameter type constructors.
 * Combines values while preserving the second type parameter.
 *
 * @template KindKey - The kind identifier for this semigroup
 */
export interface Semigroup2<KindKey extends KindKeys2> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Combines two values of the same type for two-parameter types.
   * @param fa - First value to combine
   * @returns Function that takes second value and returns combined result
   */
  concat: <A, B>(
    fa: Kind2<KindKey, A, B>
  ) => (fb: Kind2<KindKey, A, B>) => Kind2<KindKey, A, B>;
}

/**
 * Semigroup interface for three-parameter type constructors.
 * Combines values while preserving the second and third type parameters.
 *
 * @template KindKey - The kind identifier for this semigroup
 */
export interface Semigroup3<KindKey extends KindKeys3> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Combines two values of the same type for three-parameter types.
   * @param fa - First value to combine
   * @returns Function that takes second value and returns combined result
   */
  concat: <A, B, C>(
    fa: Kind3<KindKey, A, B, C>
  ) => (fb: Kind3<KindKey, A, B, C>) => Kind3<KindKey, A, B, C>;
}