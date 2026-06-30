import { type SoftStr, matchOption } from "plgg";
import {
  type Html,
  div,
  main_,
  input,
  slot,
  attr,
  class_,
} from "plgg-view";
import { type MarkdownDoc } from "plgg-md";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { navBar } from "plgg-press/theme/navBar";
import { sidebarTree } from "plgg-press/theme/sidebarTree";

/**
 * Whether the page opted into the full-width home
 * layout via its `layout: home` frontmatter marker —
 * the one variant rendered WITHOUT the sidebar (the
 * hero owns the whole content width).
 */
const isHome = (doc: MarkdownDoc): boolean =>
  matchOption<SoftStr, boolean>(
    (): boolean => false,
    (layout: SoftStr): boolean =>
      layout === "home",
  )(doc.frontmatter.layout);

/**
 * The in-body PAGE LAYOUT — the composition seam between
 * the typed chrome builders and the document
 * {@link shell}. Wraps one already-rendered `content`
 * region (an opaque `Html<never>`, embedded through the
 * typed {@link slot}) in the site chrome: the top
 * {@link navBar} marked at `activePath`, and — for
 * content/API pages — the {@link sidebarTree} beside a
 * `<main class="vp-content">` whose `.vp-doc` column
 * holds the rendered Markdown. A `layout: home` page
 * renders the hero full-width with NO sidebar.
 *
 * The mobile sidebar collapse is CSS-only: a hidden
 * `#vp-menu-toggle` checkbox sits as a sibling of the
 * layout (the `☰` label lives in the nav), so {@link
 * baseCss}'s `.vp-menu-cb:checked ~ .vp-layout
 * .vp-sidebar` general-sibling rule reveals the sidebar
 * with zero client JavaScript. Authored purely from the
 * typed flow/`slot` builders — no general-builder escape
 * hatch.
 */
/**
 * The hidden checkbox the `☰` label toggles. A sibling of the nav (and, on
 * content pages, the layout) so {@link baseCss}'s general-sibling rules can
 * reveal the mobile nav-link dropdown and the sidebar with zero client JS.
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

export const page = (
  config: SiteConfig,
  doc: MarkdownDoc,
  content: Html<never>,
  activePath: SoftStr,
  base: SoftStr,
): Html<never> =>
  isHome(doc)
    ? div(
        [class_("vp-shell")],
        [
          // even with no sidebar, the home page carries the menu checkbox so
          // the ☰ button can reveal the nav links on mobile.
          menuToggle,
          navBar(config, activePath),
          div(
            [class_("vp-home")],
            [slot([], [content])],
          ),
        ],
      )
    : div(
        [class_("vp-shell")],
        [
          menuToggle,
          navBar(config, activePath),
          div(
            [class_("vp-layout")],
            [
              sidebarTree(
                config.sidebar,
                activePath,
                base,
              ),
              main_(
                [class_("vp-content")],
                [
                  div(
                    [class_("vp-doc")],
                    [slot([], [content])],
                  ),
                ],
              ),
            ],
          ),
        ],
      );
