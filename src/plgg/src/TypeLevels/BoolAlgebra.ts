/**
 * Sentinel value for exhaustive pattern matching default cases.
 * Use this as the last pattern in match expressions to handle all remaining cases.
 * 
 * @example
 * match(
 *   [true, () => "yes"],
 *   [false, () => "no"],
 *   [OTHERWISE, () => "unknown"]
 * )
 */
export const OTHERWISE = "__MATCH_OTHERWISE__" as const;

/**
 * Type-level conditional that selects types based on boolean conditions.
 * 
 * @template C - Boolean condition type
 * @template T - Type returned if C is true
 * @template F - Type returned if C is false
 * @example
 * type Example = If<true, string, number>; // string
 * type Example2 = If<false, string, number>; // number
 */
export type If<C extends boolean, T, F> = C extends true ? T : F;

/**
 * Type-level strict equality check using distributive conditional types.
 * More precise than simple extends check.
 * 
 * @template A - First type to compare
 * @template B - Second type to compare
 * @example
 * type Test1 = IsEqual<string, string>; // true
 * type Test2 = IsEqual<string, string | number>; // false
 */
export type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

/**
 * Type-level logical AND operation.
 * 
 * @template A - First boolean type
 * @template B - Second boolean type
 * @returns true only if both A and B are true
 */
export type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false;

/**
 * Type-level logical OR operation.
 * 
 * @template A - First boolean type
 * @template B - Second boolean type
 * @returns true if either A or B is true
 */
export type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;

/**
 * Type-level extends check converted to boolean.
 * 
 * @template A - Type to check
 * @template B - Type to check against
 * @returns true if A extends B, false otherwise
 */
export type Is<A, B> = A extends B ? true : false;

/**
 * Converts a tuple type to a union of its element types.
 * 
 * @template T - Tuple type to convert
 * @example
 * type Union = TupleToUnion<[string, number, boolean]>; // string | number | boolean
 */
export type TupleToUnion<T extends ReadonlyArray<unknown>> = T[number];

/**
 * Checks if union A is a subset of union B.
 * 
 * @template A - Union to check if it's a subset
 * @template B - Union to check against
 * @returns true if all members of A are present in B
 */
export type IsUnionSubset<A, B> = [Exclude<A, B>] extends [never]
  ? true
  : false;

/**
 * Removes optional modifiers from all properties in a type.
 * 
 * @template T - Type with potentially optional properties
 * @example
 * type Optional = { a?: string; b?: number };
 * type Required = UnPartial<Optional>; // { a: string; b: number }
 */
export type UnPartial<T> = {
  [K in keyof T]-?: T[K];
};
