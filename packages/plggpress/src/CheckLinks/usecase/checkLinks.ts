import {
  type SoftStr,
  type Option,
  type Result,
  ok,
  err,
  some,
  none,
  pipe,
  fromNullable,
  matchOption,
} from "plgg";
import { isExternalHref } from "plggpress/Href/usecase/href";
import {
  type PageLinks,
  type BrokenLink,
  type BrokenLinks,
  brokenLink,
  brokenLinks,
} from "plggpress/CheckLinks/model/CheckLinks";

/**
 * The route→slug-set index built from the collected pages:
 * a route's PRESENCE here is its existence (so a lookup
 * miss is an unknown route), and its value is the page's
 * emitted heading slugs (so a `#fragment` is validated
 * against it).
 */
type SlugIndex = ReadonlyMap<
  SoftStr,
  ReadonlySet<SoftStr>
>;

/**
 * The synthetic 404 page is written as `404.html` and is
 * NOT a discovered route, so a link pointing at it is
 * EXCLUDED from the route-set expectation rather than
 * flagged. Matches the extension-less and `.html` forms a
 * GitHub Pages deploy may use.
 */
const isNotFoundPath = (body: SoftStr): boolean =>
  body === "/404" || body === "/404.html";

/**
 * Whether a path's final segment carries a file extension
 * — routes are extension-less directories, so an
 * extension-bearing target (`/logo.png`, a downloadable
 * asset) is a file, not a route, and is exempt from the
 * route-set check. Prevents false build failures on image
 * `src`s the renderer also collects as links.
 */
const isAssetPath = (body: SoftStr): boolean =>
  body
    .slice(body.lastIndexOf("/") + 1)
    .includes(".");

/**
 * Canonical route key: collapse trailing-slash/index
 * equivalence so `/concepts/option` and
 * `/concepts/option/` compare equal. Inputs are always
 * non-empty, slash-leading paths.
 */
const normalizeRoute = (
  path: SoftStr,
): SoftStr =>
  path.endsWith("/") ? path : path + "/";

/**
 * The UNPREFIXED, root-absolute body of an internal link,
 * or `None` when the link is not a resolvable internal
 * route (a base-mismatched or file-relative target). With a
 * non-root deploy `base` the link must carry it; under the
 * root base it must be root-absolute. The base prefix is
 * stripped so the body compares against the route set.
 */
const internalBody =
  (base: SoftStr) =>
  (path: SoftStr): Option<SoftStr> =>
    base === "/"
      ? path.startsWith("/")
        ? some(path)
        : none()
      : path.startsWith(base)
        ? some("/" + path.slice(base.length))
        : none();

/**
 * Split a link into its path part and an optional
 * `#fragment` (the `#` dropped); an empty fragment counts
 * as none.
 */
const splitFragment = (
  link: SoftStr,
): readonly [SoftStr, Option<SoftStr>] => {
  const i = link.indexOf("#");
  return i < 0
    ? [link, none()]
    : pipe(
        link.slice(i + 1),
        (
          frag: SoftStr,
        ): readonly [SoftStr, Option<SoftStr>] =>
          frag === ""
            ? [link.slice(0, i), none()]
            : [link.slice(0, i), some(frag)],
      );
};

/**
 * Validate an optional `#fragment` against a target page's
 * slug `set`: an absent slug yields one {@link BrokenLink},
 * no fragment yields none.
 */
const checkFragment =
  (
    set: ReadonlySet<SoftStr>,
    source: SoftStr,
    href: SoftStr,
    target: SoftStr,
  ) =>
  (
    fragment: Option<SoftStr>,
  ): ReadonlyArray<BrokenLink> =>
    pipe(
      fragment,
      matchOption(
        (): ReadonlyArray<BrokenLink> => [],
        (
          frag: SoftStr,
        ): ReadonlyArray<BrokenLink> =>
          set.has(frag)
            ? []
            : [
                brokenLink(
                  source,
                  href,
                  `unknown anchor #${frag} on ${target}`,
                ),
              ],
      ),
    );

/**
 * Validate a resolved `target` route: a lookup miss is an
 * unknown route; a hit defers any `#fragment` to the
 * target's slug set via {@link checkFragment}.
 */
const checkRoute =
  (
    slugs: SlugIndex,
    source: SoftStr,
    href: SoftStr,
    target: SoftStr,
  ) =>
  (
    fragment: Option<SoftStr>,
  ): ReadonlyArray<BrokenLink> =>
    pipe(
      fromNullable(slugs.get(target)),
      matchOption(
        (): ReadonlyArray<BrokenLink> => [
          brokenLink(
            source,
            href,
            `unknown route ${target}`,
          ),
        ],
        (
          set: ReadonlySet<SoftStr>,
        ): ReadonlyArray<BrokenLink> =>
          checkFragment(
            set,
            source,
            href,
            target,
          )(fragment),
      ),
    );

/**
 * Validate one emitted internal link from `source`:
 * external and non-resolvable (relative / base-mismatched)
 * links are ignored; a bare in-page `#fragment` validates
 * against the source page's own slugs; otherwise the
 * base-stripped path validates against the route set (the
 * 404 page and extension-bearing assets exempted) and any
 * `#fragment` against the TARGET page's slugs.
 */
const checkLink =
  (
    base: SoftStr,
    slugs: SlugIndex,
    isIgnored: (href: SoftStr) => boolean,
  ) =>
  (source: SoftStr) =>
  (href: SoftStr): ReadonlyArray<BrokenLink> =>
    isExternalHref(href) || isIgnored(href)
      ? []
      : pipe(
          splitFragment(href),
          ([path, fragment]: readonly [
            SoftStr,
            Option<SoftStr>,
          ]): ReadonlyArray<BrokenLink> =>
            path === ""
              ? checkRoute(
                  slugs,
                  source,
                  href,
                  normalizeRoute(source),
                )(fragment)
              : pipe(
                  internalBody(base)(path),
                  matchOption(
                    (): ReadonlyArray<BrokenLink> => [],
                    (
                      body: SoftStr,
                    ): ReadonlyArray<BrokenLink> =>
                      isNotFoundPath(body) ||
                      isAssetPath(body)
                        ? []
                        : checkRoute(
                            slugs,
                            source,
                            href,
                            normalizeRoute(body),
                          )(fragment),
                  ),
                ),
        );

/**
 * The PURE, build-time dead-link checker (no `node:fs`, no
 * compiler): over the per-page {@link PageLinks} collected
 * while rendering, build the route→slug-set index, then
 * fold every internal link of every page through
 * {@link checkLink}. `base` is the deploy base the links
 * were prefixed with, stripped here so UNPREFIXED routes
 * compare. Yields `ok` when every link resolves, else a
 * {@link BrokenLinks} listing each offender — the value
 * `build` fails on. Data-last in `pages`.
 *
 * `isIgnored` skips a link whose target the checker cannot
 * verify — a page linking to an existing non-page file (a
 * download, a co-located data file) the pure, fs-free
 * checker never sees as a route. It defaults to "ignore
 * nothing", so an existing caller is unchanged; the press
 * build compiles it from `SiteConfig.linkIgnore`. (Assets
 * whose path already carries an extension, and the 404
 * page, are exempt regardless — see {@link isAssetPath}.)
 */
export const checkLinks =
  (
    base: SoftStr,
    isIgnored: (href: SoftStr) => boolean = () =>
      false,
  ) =>
  (
    pages: ReadonlyArray<PageLinks>,
  ): Result<void, BrokenLinks> =>
    pipe(
      new Map<SoftStr, ReadonlySet<SoftStr>>(
        pages.map(
          (
            page: PageLinks,
          ): readonly [
            SoftStr,
            ReadonlySet<SoftStr>,
          ] => [
            normalizeRoute(page.route),
            new Set(page.slugs),
          ],
        ),
      ),
      (
        slugs: SlugIndex,
      ): ReadonlyArray<BrokenLink> =>
        pages.flatMap(
          (
            page: PageLinks,
          ): ReadonlyArray<BrokenLink> =>
            page.links.flatMap(
              checkLink(
                base,
                slugs,
                isIgnored,
              )(page.route),
            ),
        ),
      (
        broken: ReadonlyArray<BrokenLink>,
      ): Result<void, BrokenLinks> =>
        broken.length === 0
          ? ok(undefined)
          : err(brokenLinks(broken)),
    );
