import {
  Or,
  Box,
  EmptyBox,
  IsBox,
  IsEmptyBox,
  isBox,
} from "plgg/index";

/**
 * Union of fixed and parametric variants.
 */
export type Variant<
  TAG extends string,
  CONTENT,
> = Box<TAG, CONTENT> | EmptyBox<TAG>;

/**
 * Type predicate to check if T is a variant with a __tag property.
 */
export type IsVariant<T> = Or<
  IsBox<T>,
  IsEmptyBox<T>
>;

/**
 * Type guard to check if a value is any variant.
 */
export const isVariant = (
  v: unknown,
): v is Variant<string, unknown> => isBox(v);
