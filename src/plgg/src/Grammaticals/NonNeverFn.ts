/**
 * Type utility that excludes functions returning never from type unions.
 */
export type NonNeverFn<F> = F extends (
  ...args: any[]
) => never
  ? never
  : F;
