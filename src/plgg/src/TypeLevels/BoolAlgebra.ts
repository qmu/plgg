export const DEFAULT = "__MATCH_DEFAULT__" as const;

export type If<C extends boolean, T, F> = C extends true ? T : F;

export type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

export type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false;

export type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;

export type Is<A, B> = A extends B ? true : false;

export type TupleToUnion<T extends ReadonlyArray<unknown>> = T[number];

export type IsUnionSubset<A, B> = [Exclude<A, B>] extends [never]
  ? true
  : false;

export type UnPartial<T> = {
  [K in keyof T]-?: T[K];
};
