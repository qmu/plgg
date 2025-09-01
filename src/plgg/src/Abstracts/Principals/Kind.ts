import { JsonSerializable } from "plgg/index";

/**
 * Registry for mapping single-parameter type constructor keys to their concrete types.
 */
export interface KindKeytoKind1<A> {}
/**
 * Registry for mapping two-parameter type constructor keys to their concrete types.
 */
export interface KindKeytoKind2<A, B> {}
/**
 * Registry for mapping three-parameter type constructor keys to their concrete types.
 */
// @ts-ignore will have ReaderTaskResult
export interface KindKeytoKind3<A, B, C> {}

export interface KindKeytoKind1JsonSerializable<
  A extends JsonSerializable,
> {}

/**
 * Union type of all registered single-parameter kind keys.
 */
export type KindKeys1 =
  keyof KindKeytoKind1<unknown>;
/**
 * Union type of all registered two-parameter kind keys.
 */
export type KindKeys2 = keyof KindKeytoKind2<
  unknown,
  unknown
>;
/**
 * Union type of all registered three-parameter kind keys.
 */
export type KindKeys3 = keyof KindKeytoKind3<
  unknown,
  unknown,
  unknown
>;

export type KindKeys1JsonSerializable =
  keyof KindKeytoKind1JsonSerializable<JsonSerializable>;

/**
 * Resolves a kind key to its concrete single-parameter type.
 */
export type Kind1<
  KindKey extends KindKeys1,
  A,
> = KindKeytoKind1<A>[KindKey];
/**
 * Resolves a kind key to its concrete two-parameter type.
 */
export type Kind2<
  KindKey extends KindKeys2,
  A,
  B,
> = KindKeytoKind2<A, B>[KindKey];
/**
 * Resolves a kind key to its concrete three-parameter type.
 */
export type Kind3<
  KindKey extends KindKeys3,
  A,
  B,
  C,
> = KindKeytoKind3<A, B, C>[KindKey];

export type Kind1JsonSerializable<
  KindKey extends KindKeys1JsonSerializable,
  A extends JsonSerializable,
> = KindKeytoKind1JsonSerializable<A>[KindKey];
