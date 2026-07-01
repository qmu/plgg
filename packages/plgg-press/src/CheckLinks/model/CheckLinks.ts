import {
  type Box,
  type SoftStr,
  box,
  pattern,
} from "plgg";

/**
 * The per-page link surface the dead-link checker consumes
 * — pure data harvested from one page's `renderMarkdown`
 * output: the page's own route (UNPREFIXED, exactly as
 * `discoverPaths` emits it, e.g. `/concepts/intro/`), the
 * deduped heading `slugs` (the same ids the body carries),
 * and every emitted `links` target (POST-resolver, so
 * base-prefixed via `href`). No filesystem, no compiler —
 * the checker is a fold over an array of these.
 */
export type PageLinks = Readonly<{
  route: SoftStr;
  slugs: ReadonlyArray<SoftStr>;
  links: ReadonlyArray<SoftStr>;
}>;

/**
 * Constructs a {@link PageLinks}.
 */
export const pageLinks = (
  route: SoftStr,
  slugs: ReadonlyArray<SoftStr>,
  links: ReadonlyArray<SoftStr>,
): PageLinks => ({ route, slugs, links });

/**
 * One offending internal link: the page it was authored on
 * (`source`), the emitted `href` exactly as it appears in
 * the output, and a human `reason` (an unknown route or an
 * unknown `#anchor`). Plain data carried inside
 * {@link BrokenLinks}.
 */
export type BrokenLink = Readonly<{
  source: SoftStr;
  href: SoftStr;
  reason: SoftStr;
}>;

/**
 * Constructs a {@link BrokenLink}.
 */
export const brokenLink = (
  source: SoftStr,
  href: SoftStr,
  reason: SoftStr,
): BrokenLink => ({ source, href, reason });

/**
 * The build-time dead-link failure as a value — a tagged
 * `Box` (the same data idiom as `SsgError`) listing every
 * {@link BrokenLink} found across the corpus. Returned by
 * `checkLinks` and folded into `build`'s error channel so a
 * broken route or `#anchor` fails the build loudly, never
 * a thrown sentinel.
 */
export type BrokenLinks = Box<
  "BrokenLinks",
  { broken: ReadonlyArray<BrokenLink> }
>;

/**
 * Constructs a {@link BrokenLinks}.
 */
export const brokenLinks = (
  broken: ReadonlyArray<BrokenLink>,
): BrokenLinks => box("BrokenLinks")({ broken });

/**
 * Pattern matcher for folding a {@link BrokenLinks} with
 * `match` by tag.
 */
export const brokenLinks$ = () =>
  pattern("BrokenLinks")();
