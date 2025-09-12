/**
 * A variant with both a tag and body.
 */
export type Box<TAG extends string, CONTENT> = {
  __tag: TAG;
  content: CONTENT;
};

/**
 * Type predicate to check if a type is a parametric variant.
 */
export type IsBox<V> = V extends {
  __tag: infer T;
  content: infer B;
}
  ? T extends string
    ? B extends undefined
      ? false
      : true
    : false
  : false;
