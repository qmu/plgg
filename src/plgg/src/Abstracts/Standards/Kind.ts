/**
 * Higher-kinded type registry for single-parameter type constructors.
 * Maps kind keys to their concrete types for type-level programming.
 *
 * To register a new Kind1 type, use module augmentation:
 * @template A - The type parameter for the kind
 */
export interface KindKeytoKind1<A> {}
/**
 * Higher-kinded type registry for two-parameter type constructors.
 *
 * @template A - First type parameter
 * @template B - Second type parameter
 */
export interface KindKeytoKind2<A, B> {}
/**
 * Higher-kinded type registry for three-parameter type constructors.
 * Currently reserved for future use (e.g., ReaderTaskResult).
 *
 * @template A - First type parameter
 * @template B - Second type parameter
 * @template C - Third type parameter
 */
// @ts-ignore will have ReaderTaskResult
export interface KindKeytoKind3<A, B, C> {}

/**
 * Union of all registered single-parameter kind keys.
 */
export type KindKeys1 =
  keyof KindKeytoKind1<unknown>;
/**
 * Union of all registered two-parameter kind keys.
 */
export type KindKeys2 = keyof KindKeytoKind2<
  unknown,
  unknown
>;
/**
 * Union of all registered three-parameter kind keys.
 */
export type KindKeys3 = keyof KindKeytoKind3<
  unknown,
  unknown,
  unknown
>;

/**
 * Resolves a kind key to its concrete single-parameter type.
 *
 * @template KindKey - The kind identifier
 * @template A - The type parameter
 */
export type Kind1<
  KindKey extends KindKeys1,
  A,
> = KindKeytoKind1<A>[KindKey];
/**
 * Resolves a kind key to its concrete two-parameter type.
 *
 * @template KindKey - The kind identifier
 * @template A - First type parameter
 * @template B - Second type parameter
 */
export type Kind2<
  KindKey extends KindKeys2,
  A,
  B,
> = KindKeytoKind2<A, B>[KindKey];
/**
 * Resolves a kind key to its concrete three-parameter type.
 *
 * @template KindKey - The kind identifier
 * @template A - First type parameter
 * @template B - Second type parameter
 * @template C - Third type parameter
 */
export type Kind3<
  KindKey extends KindKeys3,
  A,
  B,
  C,
> = KindKeytoKind3<A, B, C>[KindKey];
