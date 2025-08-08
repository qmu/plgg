import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
} from "plgg/TypeLevels";

/**
 * Pointed interface for single-parameter type constructors.
 * Provides the ability to wrap a value in the minimal context.
 * 
 * @template KindKey - The kind identifier for this pointed functor
 */
export interface Pointed1<KindKey extends KindKeys1> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Wraps a value in the minimal context (also known as pure or return).
   * @param a - Value to wrap
   * @returns Value wrapped in the type constructor
   */
  of: <A>(a: A) => Kind1<KindKey, A>;
}

/**
 * Pointed interface for two-parameter type constructors.
 * 
 * @template KindKey - The kind identifier for this pointed functor
 */
export interface Pointed2<KindKey extends KindKeys2> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Wraps a value in the minimal context for two-parameter types.
   * @param a - Value to wrap
   * @returns Value wrapped in the type constructor
   */
  of: <A = never, B = never>(a: A) => Kind2<KindKey, A, B>;
}

/**
 * Pointed interface for three-parameter type constructors.
 * 
 * @template KindKey - The kind identifier for this pointed functor
 */
export interface Pointed3<KindKey extends KindKeys3> {
  /** The kind key identifier */
  readonly KindKey: KindKey;
  /**
   * Wraps a value in the minimal context for three-parameter types.
   * @param a - Value to wrap
   * @returns Value wrapped in the type constructor
   */
  of: <A = never, B = never, C = never>(a: A) => Kind3<KindKey, A, B, C>;
}

