/**
 * Brand type for nominal typing.
 */
export type Brand<T, U extends string> = T & { readonly __: U };
