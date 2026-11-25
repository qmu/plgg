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
  EXTERNAL.test(path) || path.startsWith("//");

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
 * owns — the one `LinkResolver` plggpress injects into
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
    isExternalHref(path) || path.startsWith("#")
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
 * The directory a route's own relative links are written
 * from: a route that names a directory (`/`, `/guide/`) is
 * that directory, any other route (`/guide/dsl`) is the
 * directory holding it.
 */
const dirOf = (route: SoftStr): SoftStr =>
  route.endsWith("/")
    ? route
    : route.slice(0, route.lastIndexOf("/") + 1);

/** Fold `.` and `..` out of an absolute path. */
const normalize = (path: SoftStr): SoftStr =>
  "/" +
  path
    .split("/")
    .reduce<ReadonlyArray<SoftStr>>(
      (kept, part) =>
        part === "" || part === "."
          ? kept
          : part === ".."
            ? kept.slice(0, -1)
            : [...kept, part],
      [],
    )
    .join("/") +
  (path.endsWith("/") && path !== "/" ? "/" : "");

/**
 * Whether a relative path, read from `dir`, climbs
 * above the site's root — more `..` than there are
 * folders to leave. Such a link names something outside
 * the site (a neighbouring package in the repository the
 * page was written in), so it is not a site address.
 */
const climbsOut = (path: SoftStr): boolean =>
  path
    .split("/")
    .reduce<number>(
      (depth, part) =>
        depth < 0
          ? depth
          : part === "" || part === "."
            ? depth
            : part === ".."
              ? depth - 1
              : depth + 1,
      0,
    ) < 0;

/**
 * A link that carries its own scheme without `//`
 * (`mailto:`, `tel:`, `data:`): not a path at all.
 */
const SCHEMED = /^[a-z][a-z0-9+.-]*:/i;

/**
 * {@link href} for a link written INSIDE the page at
 * `route`: a relative target (`./camera.md`,
 * `../samples/space.md`) is resolved against that page's
 * own directory first, so what is emitted is always a
 * site-absolute, base-prefixed address.
 *
 * A relative `href` cannot survive the two things this
 * site does with a page. A static host serves `/guide/dsl`
 * as `/guide/dsl/`, which moves every `../` one level; and
 * a page opened as a column sits under ANOTHER page's
 * address, which moves them all. An absolute address means
 * the same thing wherever the column stands.
 */
export const hrefFrom =
  (base: SoftStr, route: SoftStr) =>
  (path: SoftStr): SoftStr =>
    isExternalHref(path) ||
    path.startsWith("#") ||
    path.startsWith("/")
      ? href(base)(path)
      : SCHEMED.test(path) ||
          path === "" ||
          path.startsWith("?") ||
          climbsOut(dirOf(route) + path)
        ? path
        : pipe(
            splitFragment(path),
            ([body, fragment]: readonly [
              SoftStr,
              SoftStr,
            ]): SoftStr =>
              href(base)(
                normalize(dirOf(route) + body) +
                  fragment,
              ),
          );

/**
 * The inverse of {@link href} for a root-absolute path:
 * drop the deploy `base` prefix, so a link the browser
 * carries (always base-prefixed) names the ROUTE the
 * router registered (never base-prefixed). Needed because
 * a composition URL is composed from `href`-resolved links
 * on the client and resolved back to source files on the
 * server. A root base, or a path that does not carry the
 * prefix, is returned unchanged.
 */
export const unbase =
  (base: SoftStr) =>
  (path: SoftStr): SoftStr =>
    pipe(
      base.endsWith("/") ? base : base + "/",
      (prefix: SoftStr): SoftStr =>
        prefix === "/" || !path.startsWith(prefix)
          ? path
          : "/" + path.slice(prefix.length),
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
