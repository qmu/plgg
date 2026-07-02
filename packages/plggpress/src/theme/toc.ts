import {
  type Html,
  type MdHeading,
  details,
  summary,
  nav,
  ul,
  li,
  a,
  text,
  attr,
  class_,
} from "plggmatic";

/**
 * The section headings eligible for the 目次: h2–h4 only —
 * the h1 is the page title, and depths past four don't
 * appear in the oracle's TOC either.
 */
export const tocHeadings = (
  headings: ReadonlyArray<MdHeading>,
): ReadonlyArray<MdHeading> =>
  headings.filter(
    (h) => h.level >= 2 && h.level <= 4,
  );

/**
 * The in-article collapsible 目次 (qmu.co.jp's mobile-toc,
 * ported): a native `details`/`summary` disclosure — so it
 * is keyboard-operable with no JavaScript — listing the
 * page's section headings as anchor links to the exact
 * slug ids the renderer stamped ({@link MdHeading} shares
 * one slugger run with the body, so the anchors cannot
 * drift). Depth-3+ entries indent via `vp-toc-sub`. The
 * open/close animation lives in `baseCss` behind
 * `@supports (interpolate-size)` and the reduced-motion
 * guard; browsers without it toggle instantly.
 */
export const toc = (
  headings: ReadonlyArray<MdHeading>,
): Html<never, "details"> =>
  details(
    [class_("vp-toc")],
    [
      summary([], [text("目次")]),
      nav(
        [attr("aria-label", "Table of contents")],
        [
          ul(
            [],
            tocHeadings(headings).map(
              (h): Html<never, "li"> =>
                li(
                  h.level >= 3
                    ? [class_("vp-toc-sub")]
                    : [],
                  [
                    a(
                      [
                        attr(
                          "href",
                          "#" + h.slug,
                        ),
                      ],
                      [text(h.text)],
                    ),
                  ],
                ),
            ),
          ),
        ],
      ),
    ],
  );
