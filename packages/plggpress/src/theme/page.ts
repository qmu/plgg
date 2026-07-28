import {
  type SoftStr,
  type Option,
  some,
  none,
  fromNullable,
  matchOption,
} from "plgg";
import {
  type Html,
  type Flow,
  type Attribute,
  div,
  nav,
  main_,
  a,
  p,
  span,
  input,
  label,
  slot,
  text,
  attr,
  class_,
} from "plggpress/framework";
import { row, column } from "plggmatic";
import {
  type SiteConfig,
  type SidebarGroup,
  type SidebarItem,
} from "plggpress/SiteConfig/model/SiteConfig";
import {
  chromeRail,
  mobileBar,
  socialLinks,
} from "plggpress/theme/navBar";
import { sidebarTree } from "plggpress/theme/sidebarTree";
import {
  href,
  samePath,
} from "plggpress/Href/usecase/href";

/**
 * The hidden checkbox the `☰` mobile-bar label toggles. A
 * sibling of the column strip and the backdrop (inside
 * `.vp-shell`) so {@link baseCss}'s general-sibling rules
 * can slide the off-canvas sections column in and dim the
 * backdrop with zero client JavaScript.
 */
const menuToggle = input(
  [
    class_("vp-menu-cb"),
    attr("type", "checkbox"),
    attr("id", "vp-menu-toggle"),
    attr("aria-hidden", "true"),
  ],
  [],
);

/**
 * The dimmed backdrop behind an open mobile drawer — a
 * `<label>` for the menu checkbox, so tapping it closes
 * the drawer (CSS-only). Hidden until the checkbox is
 * checked.
 */
const backdrop = label(
  [
    attr("for", "vp-menu-toggle"),
    class_("vp-backdrop"),
    attr("aria-hidden", "true"),
  ],
  [],
);

/** The centred, muted copyright footer confined to the
 * content column, on every page. */
const siteFooter = (
  config: SiteConfig,
): Html<never, "div"> =>
  div(
    [
      class_("vp-footer"),
      attr("role", "contentinfo"),
    ],
    [
      p(
        [class_("vp-footer-text")],
        [text("© " + config.title)],
      ),
    ],
  );

/**
 * The first descendant leaf link under a sidebar item
 * subtree — the target a section header links to so
 * selecting a section lands on its opening page. `None`
 * when the subtree carries no link at all.
 */
const firstLeafLink = (
  items: ReadonlyArray<SidebarItem>,
): Option<SoftStr> =>
  items.reduce<Option<SoftStr>>(
    (
      acc: Option<SoftStr>,
      item: SidebarItem,
    ): Option<SoftStr> =>
      matchOption<SoftStr, Option<SoftStr>>(
        () =>
          matchOption<SoftStr, Option<SoftStr>>(
            () => firstLeafLink(item.items),
            (link: SoftStr) => some(link),
          )(item.link),
        (found: SoftStr) => some(found),
      )(acc),
    none(),
  );

/**
 * Whether a group's subtree contains a leaf whose link
 * resolves to the active path — i.e. the reader is
 * currently inside this section.
 */
const groupHasActive = (
  group: SidebarGroup,
  activePath: SoftStr,
  base: SoftStr,
): boolean => {
  const sameAsActive = samePath(base);
  const anyItemActive = (
    item: SidebarItem,
  ): boolean =>
    matchOption<SoftStr, boolean>(
      () => false,
      (link: SoftStr) =>
        sameAsActive(link, activePath),
    )(item.link) ||
    item.items.some(anyItemActive);
  return group.items.some(anyItemActive);
};

/**
 * The top-level SECTIONS column (the strip's leftmost
 * `pm-col`): the wordmark home link and one entry per
 * sidebar group. Selecting a section navigates to its
 * opening page and — in the SSR strip — the active
 * section's own tree drills open as the column to the
 * right. Below lg this column becomes the CSS-only
 * off-canvas drawer.
 */
const sectionsColumn = (
  config: SiteConfig,
  activePath: SoftStr,
  base: SoftStr,
): Html<never> => {
  const hrefOf = href(config.base);
  const sameAsActive = samePath(config.base);
  const wordmarkAttrs: ReadonlyArray<
    Attribute<never>
  > = sameAsActive("/", activePath)
    ? [
        attr("href", hrefOf("/")),
        attr("aria-current", "page"),
        class_("vp-wordmark"),
      ]
    : [
        attr("href", hrefOf("/")),
        class_("vp-wordmark"),
      ];
  const groupEntry = (
    group: SidebarGroup,
  ): Flow<never> => {
    const active = groupHasActive(
      group,
      activePath,
      base,
    );
    return matchOption<SoftStr, Flow<never>>(
      () =>
        span(
          [class_("vp-sidebar-flat")],
          [text(group.text)],
        ),
      (link: SoftStr) =>
        a(
          active
            ? [
                attr("href", hrefOf(link)),
                attr("aria-current", "page"),
                class_("vp-sidebar-link"),
              ]
            : [
                attr("href", hrefOf(link)),
                class_("vp-sidebar-link"),
              ],
          [text(group.text)],
        ),
    )(firstLeafLink(group.items));
  };
  return column(
    ["vp-sidebar"],
    [
      nav(
        [
          class_("vp-sidebar-nav"),
          attr("aria-label", "Sections"),
        ],
        [
          a(wordmarkAttrs, [text(config.title)]),
          ...config.sidebar.map(groupEntry),
        ],
      ),
      socialLinks(config, "vp-sidebar-social"),
    ],
  );
};

/**
 * The DRILLED section column — the `pm-col` that opens to
 * the right of the sections column when the reader is
 * inside a section. It renders JUST the active group's
 * always-expanded {@link sidebarTree}, so the section's
 * pages read as an independent column. Absent (no extra
 * column) when the active path is in no group — home and
 * stray pages show the sections + content pair only, and
 * drilling into a section adds this column.
 */
const drilledColumn = (
  config: SiteConfig,
  activePath: SoftStr,
  base: SoftStr,
): ReadonlyArray<Html<never>> => {
  return matchOption<
    SidebarGroup,
    ReadonlyArray<Html<never>>
  >(
    () => [],
    (active: SidebarGroup) => [
      column(
        ["vp-section"],
        [sidebarTree([active], activePath, base)],
      ),
    ],
  )(
    fromNullable(
      config.sidebar.find(
        (group: SidebarGroup): boolean =>
          groupHasActive(group, activePath, base),
      ),
    ),
  );
};

/**
 * The in-body PAGE LAYOUT — plggpress's column-oriented
 * horizontal strip, rendered through plggmatic's
 * {@link row}/{@link column} combinators (the `pm-row` /
 * `pm-col` skeleton the framework owns). Depth is expressed
 * by COLUMNS, never by consuming the viewport: the sections
 * column sits at the far left, the active section drills
 * open as a column to its right, then the `<main>` content
 * column holds the rendered `content` (an opaque
 * `Html<never>` embedded through the typed {@link slot})
 * plus the {@link siteFooter}, and the chrome rail closes
 * the strip. As the strip grows the top bar/body width
 * stays fixed and the row scrolls horizontally beneath.
 * Below lg the rail hides, a sticky {@link mobileBar}
 * appears, and the sections column becomes a CSS-only
 * off-canvas drawer driven by the hidden {@link menuToggle}
 * checkbox. The palette is plggmatic's monochrome
 * `defaultTheme` throughout. Authored purely from the typed
 * flow/`slot` builders — no general-builder escape hatch.
 */
export const page = (
  config: SiteConfig,
  content: Html<never>,
  activePath: SoftStr,
  base: SoftStr,
): Html<never> => {
  const contentColumn = column(
    ["vp-content"],
    [
      main_(
        [class_("vp-main")],
        [
          div(
            [class_("vp-doc")],
            [slot([], [content])],
          ),
          siteFooter(config),
        ],
      ),
    ],
  );
  return slot(
    [class_("vp-shell")],
    [
      menuToggle,
      // The home page carries the sections column too
      // (qmu.co.jp renders its landing page through the
      // same strip): with no top nav, the sections column
      // is the ONLY way to reach articles, so a sidebar-
      // less home is a navigation dead-end. The `☰` drawer
      // is enabled on every page for the same reason.
      mobileBar(config, activePath, true),
      backdrop,
      row(
        ["vp-app"],
        [
          sectionsColumn(
            config,
            activePath,
            base,
          ),
          ...drilledColumn(
            config,
            activePath,
            base,
          ),
          contentColumn,
          chromeRail(config),
        ],
      ),
    ],
  );
};
