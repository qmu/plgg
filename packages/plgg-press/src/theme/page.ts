import { type SoftStr, matchOption } from "plgg";
import {
  type Html,
  div,
  slot,
} from "plgg-view";
import {
  style_,
  flex,
  items,
  grow,
  gap,
  px,
  py,
} from "plgg-view/style";
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
 * The in-body PAGE LAYOUT — the missing composition
 * seam between the typed chrome builders and the
 * document {@link shell}. Wraps one already-rendered
 * `content` region (an opaque `Html<never>` the
 * content model can't statically constrain, embedded
 * through the typed {@link slot}) in the site chrome:
 * the top {@link navBar} marked at `activePath`, and —
 * for content/API pages — the {@link sidebarTree}
 * beside the content, with the entry on the way to
 * `activePath` marked active and revealed. A
 * `layout: home` page renders the hero full-width with
 * NO sidebar. Authored purely from the typed
 * flow/`slot` builders — no general-builder escape
 * hatch — so the page stays a semantically complete,
 * JS-free landmark tree.
 */
export const page = (
  config: SiteConfig,
  doc: MarkdownDoc,
  content: Html<never>,
  activePath: SoftStr,
  base: SoftStr,
): Html<never> =>
  isHome(doc)
    ? div(
        [],
        [
          navBar(config, activePath),
          slot([], [content]),
        ],
      )
    : div(
        [],
        [
          navBar(config, activePath),
          div(
            [
              style_(
                flex,
                items("start"),
                gap(6),
                px(4),
                py(4),
              ),
            ],
            [
              sidebarTree(
                config.sidebar,
                activePath,
                base,
              ),
              div(
                [style_(grow)],
                [slot([], [content])],
              ),
            ],
          ),
        ],
      );
