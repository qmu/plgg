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
 * Monoid interface for single-parameter type constructors.
 * Extends Semigroup with an identity element (empty).
 *
 * Monoid laws:
 * - Left Identity: concat(empty, a) === a
 * - Right Identity: concat(a, empty) === a
 * - Associativity: concat(concat(a, b), c) === concat(a, concat(b, c)) (inherited from Semigroup)
 *
 * @template KindKey - The kind identifier for this monoid
 * @example
 * // Array implements Monoid1
 * const arrayMonoid: Monoid1<"Arr"> = {
 *   KindKey: "Arr",
 *   concat: <A>(fa: Arr<A>) => (fb: Arr<A>) => [...fa, ...fb],
 *   empty: <A>() => [] as Arr<A>
 * };
 */
export interface Monoid1<KindKey extends KindKeys1>
  extends Semigroup1<KindKey> {
  /**
   * The identity element for the concat operation.
   * @returns The identity/empty value for this monoid
   */
  empty: <A>() => Kind1<KindKey, A>;
}

/**
 * Monoid interface for two-parameter type constructors.
 * Extends Semigroup with an identity element.
 *
 * @template KindKey - The kind identifier for this monoid
 */
export interface Monoid2<KindKey extends KindKeys2>
  extends Semigroup2<KindKey> {
  /**
   * The identity element for the concat operation for two-parameter types.
   * @returns The identity/empty value for this monoid
   */
  empty: <A = never, B = never>() => Kind2<KindKey, A, B>;
}

/**
 * Monoid interface for three-parameter type constructors.
 * Extends Semigroup with an identity element.
 *
 * @template KindKey - The kind identifier for this monoid
 */
export interface Monoid3<KindKey extends KindKeys3>
  extends Semigroup3<KindKey> {
  /**
   * The identity element for the concat operation for three-parameter types.
   * @returns The identity/empty value for this monoid
   */
  empty: <A = never, B = never, C = never>() => Kind3<KindKey, A, B, C>;
}

