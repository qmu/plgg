import { some, none } from "plgg";
import {
  type Html,
  div,
  main_,
  h1,
  p,
  a,
  text,
  attr,
  class_,
} from "plggmatic";
import {
  type MarkdownDoc,
  frontmatter,
} from "plggmatic";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { href } from "plggpress/Href/usecase/href";
import { shell } from "plggpress/theme/shell";
import {
  chromeRail,
  mobileBar,
} from "plggpress/theme/navBar";

/**
 * The 404 page, rendered through the SAME document
 * {@link shell} as every content page so it inherits the
 * site chrome and style injection. Like the home page it
 * is sidebar-less: the far-left chrome rail (lg+) and the
 * sticky mobile bar (below lg, with no menu button since
 * there is no drawer) frame a centred, monochrome
 * not-found message whose only link is base-prefixed home.
 * The `activePath` is a sentinel no real route matches, so
 * the wordmark is never marked current. The synthetic
 * {@link MarkdownDoc} carries a `firstHeading` so the
 * shell derives a meaningful `<title>`.
 */
export const notFound = (
  config: SiteConfig,
): Html<never> => {
  const hrefOf = href(config.base);
  const body = div(
    [class_("vp-shell")],
    [
      mobileBar(config, "/404", false),
      div(
        [class_("vp-app")],
        [
          chromeRail(config),
          main_(
            [class_("vp-content")],
            [
              div(
                [class_("vp-notfound")],
                [
                  h1(
                    [],
                    [text("Page not found")],
                  ),
                  p(
                    [],
                    [
                      text(
                        "The page you were looking for does not exist.",
                      ),
                    ],
                  ),
                  a(
                    [attr("href", hrefOf("/"))],
                    [text("Go to the home page")],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
  const doc: MarkdownDoc = {
    frontmatter: frontmatter(none()),
    firstHeading: some("Page not found"),
    body,
    links: [],
    slugs: [],
  };
  return shell(config, doc, body);
};
