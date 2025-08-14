/**
 * Higher-kinded type registry for single-parameter type constructors.
 */
export interface KindKeytoKind1<A> {}
/**
 * Higher-kinded type registry for two-parameter type constructors.
 */
export interface KindKeytoKind2<A, B> {}
/**
 * Higher-kinded type registry for three-parameter type constructors.
 */
// @ts-ignore will have ReaderTaskResult
export interface KindKeytoKind3<A, B, C> {}

/**
 * Union of all registered single-parameter kind keys.
 */
export type KindKeys1 = keyof KindKeytoKind1<unknown>;
/**
 * Union of all registered two-parameter kind keys.
 */
export type KindKeys2 = keyof KindKeytoKind2<unknown, unknown>;
/**
 * Union of all registered three-parameter kind keys.
 */
export type KindKeys3 = keyof KindKeytoKind3<unknown, unknown, unknown>;

/**
 * Resolves a kind key to its concrete single-parameter type.
 */
export type Kind1<KindKey extends KindKeys1, A> = KindKeytoKind1<A>[KindKey];
/**
 * Resolves a kind key to its concrete two-parameter type.
 */
export type Kind2<KindKey extends KindKeys2, A, B> = KindKeytoKind2<
  A,
  B
>[KindKey];
/**
 * Resolves a kind key to its concrete three-parameter type.
 */
export type Kind3<KindKey extends KindKeys3, A, B, C> = KindKeytoKind3<
  A,
  B,
  C
>[KindKey];
