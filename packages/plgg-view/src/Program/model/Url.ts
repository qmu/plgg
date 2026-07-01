import { SoftStr } from "plgg";

/**
 * The browser location an {@link application} reacts to — just the in-app parts
 * (pathname + raw search string). The app maps this to its own route value
 * (e.g. with plgg-router's pure `compilePattern`/`matchSegments`); plgg-view
 * stays dependency-free of any router.
 */
export type Url = Readonly<{
  path: SoftStr;
  search: SoftStr;
}>;

/**
 * Constructs a {@link Url}.
 */
export const makeUrl = (
  path: SoftStr,
  search: SoftStr,
): Url => ({ path, search });
