/**
 * Type utility that excludes functions returning never from type unions.
 * Used to filter out invalid function types during type-safe composition.
 */
export type NonNeverFn<F> = F extends (...args: any[]) => never ? never : F;