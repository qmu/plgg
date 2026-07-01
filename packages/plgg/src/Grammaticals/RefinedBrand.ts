import {
  Box,
  Result,
  ok,
  err,
  box,
  isBoxWithTag,
} from "plgg/index";

/**
 * The trio a refined scalar brand needs, built
 * from a single `qualify` predicate: a guard, a
 * boundary caster, and an unwrapper. Collapses
 * the hand-written five-part idiom (type +
 * qualify + `isX` + triple-branch `asX` +
 * `xString`) into one factory.
 */
export interface RefinedBrand<
  TAG extends string,
  CONTENT,
  E,
> {
  /** Guard for a qualifying `Box<TAG, CONTENT>`. */
  is: (v: unknown) => v is Box<TAG, CONTENT>;
  /**
   * Validates an unknown at a boundary into the
   * brand, or fails with `E`. Accepts an already
   * -branded value, a bare qualifying content, or
   * rejects.
   */
  as: (v: unknown) => Result<Box<TAG, CONTENT>, E>;
  /** The underlying content of a branded value. */
  unwrap: (b: Box<TAG, CONTENT>) => CONTENT;
}

/**
 * Builds a {@link RefinedBrand} for `tag` from a
 * content predicate and an error builder. The
 * `const TAG` keeps the tag literal, so
 * `refinedBrand("Version", …)` brands as
 * `Box<"Version", …>`, not `Box<string, …>`.
 */
export const refinedBrand = <
  const TAG extends string,
  CONTENT,
  E,
>(
  tag: TAG,
  qualify: (v: unknown) => v is CONTENT,
  errorFor: (v: unknown) => E,
): RefinedBrand<TAG, CONTENT, E> => {
  const is = (
    v: unknown,
  ): v is Box<TAG, CONTENT> =>
    isBoxWithTag(tag)(v) && qualify(v.content);
  const as = (
    v: unknown,
  ): Result<Box<TAG, CONTENT>, E> =>
    is(v)
      ? ok(v)
      : qualify(v)
        ? ok(box(tag)(v))
        : err(errorFor(v));
  const unwrap = (
    b: Box<TAG, CONTENT>,
  ): CONTENT => b.content;
  return { is, as, unwrap };
};
