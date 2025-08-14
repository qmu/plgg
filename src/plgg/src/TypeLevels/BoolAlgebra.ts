/**
 * Sentinel value for exhaustive pattern matching default cases.
 */
export const OTHERWISE =
  "__MATCH_OTHERWISE__" as const;

/**
 * Type-level conditional that selects types based on boolean conditions.
 */
export type If<
  C extends boolean,
  T,
  F,
> = C extends true ? T : F;

/**
 * Type-level strict equality check using distributive conditional types.
 */
export type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <
    T,
  >() => T extends B ? 1 : 2
    ? true
    : false;

/**
 * Type-level logical AND operation.
 */
export type And<
  A extends boolean,
  B extends boolean,
> = A extends true
  ? B extends true
    ? true
    : false
  : false;

/**
 * Type-level logical OR operation.
 */
export type Or<
  A extends boolean,
  B extends boolean,
> = A extends true
  ? true
  : B extends true
    ? true
    : false;

/**
 * Type-level extends check converted to boolean.
 */
export type Is<A, B> = A extends B ? true : false;

/**
 * Converts a tuple type to a union of its element types.
 */
export type TupleToUnion<
  T extends ReadonlyArray<unknown>,
> = T[number];

/**
 * Checks if union A is a subset of union B.
 */
export type IsUnionSubset<A, B> = [
  Exclude<A, B>,
] extends [never]
  ? true
  : false;

/**
 * Removes optional modifiers from all properties in a type.
 */
export type UnPartial<T> = {
  [K in keyof T]-?: T[K];
};
