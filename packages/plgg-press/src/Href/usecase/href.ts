import { type SoftStr, pipe } from "plgg";

/**
 * Matches an absolute external URL: a scheme followed by
 * `://` (`https://`, `http://`, …) or a protocol-relative
 * `//host` link. Such links are left exactly as authored.
 */
const EXTERNAL = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Whether a link points outside the site and must never
 * be base-prefixed.
 */
export const isExternalHref = (
  path: SoftStr,
): boolean =>
  EXTERNAL.test(path) ||
  path.startsWith("//");

/**
 * Split a link into its path part and a trailing
 * `#fragment` (empty when none), so the fragment rides
 * through normalization untouched.
 */
const splitFragment = (
  path: SoftStr,
): readonly [SoftStr, SoftStr] => {
  const i = path.indexOf("#");
  return i < 0
    ? [path, ""]
    : [path.slice(0, i), path.slice(i)];
};

/**
 * Drop the TypeDoc/Markdown `.md` suffix (and a directory
 * `/index.md`) so file-relative doc links resolve to the
 * extension-less output path the spike recorded (§6g).
 */
const stripMd = (path: SoftStr): SoftStr =>
  path.endsWith("/index.md")
    ? path.slice(0, -"index.md".length)
    : path.endsWith(".md")
      ? path.slice(0, -".md".length)
      : path;

/**
 * Prefix a root-absolute internal path with the deploy
 * `base`, collapsing the boundary slash. Anything not
 * root-absolute (a file-relative link) is returned as-is.
 */
const prefixBase =
  (base: SoftStr) =>
  (path: SoftStr): SoftStr =>
    path.startsWith("/")
      ? base.endsWith("/")
        ? base + path.slice(1)
        : base + path
      : path;

/**
 * The SINGLE base-path/link resolver the whole facade
 * owns — the one `LinkResolver` plgg-press injects into
 * plgg-md, so no base logic is ever reconstructed
 * elsewhere. Curried `base` first (data-last `path`):
 *
 * - external (`scheme://`, `//host`) links: untouched;
 * - bare same-page `#fragment` links: untouched;
 * - root-absolute internal links/images: prefixed with
 *   `base`, with the TypeDoc `.md` form normalized to the
 *   extension-less output path, preserving any trailing
 *   `#fragment`.
 */
export const href =
  (base: SoftStr) =>
  (path: SoftStr): SoftStr =>
    isExternalHref(path) ||
    path.startsWith("#")
      ? path
      : pipe(
          splitFragment(path),
          ([body, fragment]: readonly [
            SoftStr,
            SoftStr,
          ]): SoftStr =>
            prefixBase(base)(stripMd(body)) +
            fragment,
        );

/**
 * Drop a trailing `/` from a resolved path, keeping the
 * bare root `/` intact — the canonical form for the
 * trailing-slash-insensitive page comparison below.
 */
const dropTrailingSlash = (
  path: SoftStr,
): SoftStr =>
  path.length > 1 && path.endsWith("/")
    ? path.slice(0, -1)
    : path;

/**
 * Whether two links resolve to the SAME page under
 * `base` — the active-state test the chrome marks on.
 * Compares the base-resolved paths
 * trailing-slash-insensitively, because a sidebar/nav
 * link authored as `/getting-started` and the route
 * `discoverPaths` emits for it (`/getting-started/`,
 * every directory-index route carrying a trailing
 * slash) name the same page. Without this the active
 * entry would never match the route being rendered.
 */
export const samePath =
  (base: SoftStr) =>
  (a: SoftStr, b: SoftStr): boolean =>
    dropTrailingSlash(href(base)(a)) ===
    dropTrailingSlash(href(base)(b));
