import { Datum } from "plgg/index";

/**
 * Registry for mapping single-parameter type constructor keys to their concrete types.
 */
export interface MapKind1<A> {}

/**
 * Registry for mapping two-parameter type constructor keys to their concrete types.
 */
export interface MapKind2<A, B> {}

/**
 * Registry for mapping three-parameter type constructor keys to their concrete types.
 */
// @ts-ignore will have ReaderTaskResult
export interface MapKind3<A, B, C> {}

/**
 * Registry for mapping single-parameter type constructor keys to their concrete Datum types.
 */
export interface MapKindDatum<A extends Datum> {}

// ----------------------------------------------------------------

/**
 * Union type of all registered single-parameter kind keys.
 */
export type KindKeys1 = keyof MapKind1<unknown>;

/**
 * Union type of all registered two-parameter kind keys.
 */
export type KindKeys2 = keyof MapKind2<
  unknown,
  unknown
>;

/**
 * Union type of all registered three-parameter kind keys.
 */
export type KindKeys3 = keyof MapKind3<
  unknown,
  unknown,
  unknown
>;

/**
 * Union type of all registered single-parameter Datum kind keys.
 */
export type KindKeysDatum =
  keyof MapKindDatum<Datum>;

// ----------------------------------------------------------------

/**
 * Resolves a kind key to its concrete single-parameter type.
 */
export type Kind1<
  KindKey extends KindKeys1,
  A,
> = MapKind1<A>[KindKey];

/**
 * Resolves a kind key to its concrete two-parameter type.
 */
export type Kind2<
  KindKey extends KindKeys2,
  A,
  B,
> = MapKind2<A, B>[KindKey];

/**
 * Resolves a kind key to its concrete three-parameter type.
 */
export type Kind3<
  KindKey extends KindKeys3,
  A,
  B,
  C,
> = MapKind3<A, B, C>[KindKey];

/**
 * Resolves a kind key to its concrete single-parameter Datum type.
 */
export type KindDatum<
  KindKey extends KindKeysDatum,
  A extends Datum,
> = MapKindDatum<A>[KindKey];
