/**
 * Type utility that excludes functions returning never from type unions.
 * Used to filter out invalid function types during type-safe composition.
 *
 * @template F - Function type to check
 * @example
 * type ValidFn = NonNeverFn<(x: number) => string>; // (x: number) => string
 * type InvalidFn = NonNeverFn<(x: number) => never>; // never
 */
export type NonNeverFn<F> = F extends (...args: any[]) => never ? never : F;

