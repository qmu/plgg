import { type SoftStr } from "plgg";
import {
  type Html,
  section,
  div,
  h1,
  h3,
  p,
  a,
  text,
  attr,
  class_,
} from "plgg-view";
import {
  type HomeConfig,
  type HomeAction,
  type HomeFeature,
} from "plgg-press/SiteConfig/model/SiteConfig";
import { href } from "plgg-press/Href/usecase/href";

/**
 * The landing-page hero + feature grid, rendered
 * GENERICALLY from the injected {@link HomeConfig} DATA —
 * the theme hard-codes no copy. The hero shows the
 * config's `title`/`tagline` and maps every `action` to a
 * call-to-action button (the first is the primary accent,
 * the rest are alternate; all routed through {@link href}
 * so the deploy `base` applies once); each `feature`
 * becomes a card. Presentation — the centred hero, the
 * button styles, and the responsive card GRID — is owned
 * by {@link baseCss} via the `.vp-hero` / `.vp-actions` /
 * `.vp-features` classes, so any consumer's home data
 * renders without theme changes.
 */
export const homeHero = (
  home: HomeConfig,
  base: SoftStr,
): Html<never, "section"> => {
  const hrefOf = href(base);
  const action = (
    item: HomeAction,
    index: number,
  ): Html<never, "a"> =>
    a(
      [
        attr("href", hrefOf(item.link)),
        class_(
          index === 0
            ? "vp-action vp-action-primary"
            : "vp-action vp-action-alt",
        ),
      ],
      [text(item.text)],
    );
  const feature = (
    item: HomeFeature,
  ): Html<never, "div"> =>
    div(
      [class_("vp-feature")],
      [
        h3([], [text(item.title)]),
        p([], [text(item.details)]),
      ],
    );
  return section(
    [],
    [
      div(
        [class_("vp-hero")],
        [
          h1(
            [class_("vp-hero-title")],
            [text(home.title)],
          ),
          p(
            [class_("vp-hero-tagline")],
            [text(home.tagline)],
          ),
          div(
            [class_("vp-actions")],
            home.actions.map((item, index) =>
              action(item, index),
            ),
          ),
        ],
      ),
      div(
        [class_("vp-features")],
        home.features.map((item) => feature(item)),
      ),
    ],
  );
};
