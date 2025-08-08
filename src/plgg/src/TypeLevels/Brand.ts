/**
 * Brand type for nominal typing.
 * Allows creating distinct types from the same underlying type.
 * 
 * @template T - The underlying type to brand
 * @template U - String literal brand identifier
 * @example
 * type UserId = Brand<number, "UserId">;
 * type OrderId = Brand<number, "OrderId">;
 * // UserId and OrderId are now incompatible despite both being numbers
 */
export type Brand<T, U extends string> = T & { readonly __: U };
