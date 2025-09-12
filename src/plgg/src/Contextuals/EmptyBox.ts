import { Box } from "./Box";

/**
 * A variant with only a tag and no body.
 */
export type EmptyBox<TAG extends string> = Box<
  TAG,
  undefined
>;

/**
 * Type predicate to check if a type is a fixed variant.
 */
export type IsEmptyBox<V> = V extends {
  __tag: infer T;
  content: undefined;
}
  ? T extends string
    ? true
    : false
  : false;