/**
 * Type utility that excludes functions returning never.
 */
export type NonNeverFn<F> = F extends (
  ...args: any[]
) => never
  ? never
  : F;
