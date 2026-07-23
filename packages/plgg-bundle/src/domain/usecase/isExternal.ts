import { type External } from "plgg-bundle/domain/model/BundleConfig";

/**
 * Decide whether a specifier is external given the
 * config's {@link External} declaration, dispatching on
 * its three shapes: a string array (exact match), a
 * `RegExp` (test), or a predicate function (call). This
 * is the single place the three vite-config external
 * forms — string[], `/^node:/`, and plgg-fetch's
 * `isFrameworkDep` predicate — converge.
 */
export const isExternal = (
  external: External,
  specifier: string,
): boolean =>
  typeof external === "function"
    ? external(specifier)
    : external instanceof RegExp
      ? external.test(specifier)
      : external.includes(specifier);
