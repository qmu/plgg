import {
  type Html,
  section,
  div,
  h1,
  h3,
  p,
  text,
  class_,
} from "plgg-view";
import {
  type HomeConfig,
  type HomeFeature,
} from "plgg-press/SiteConfig/model/SiteConfig";

/**
 * The landing-page hero + feature grid, rendered
 * GENERICALLY from the injected {@link HomeConfig} DATA —
 * the theme hard-codes no copy. Following qmu.co.jp the
 * hero is LEFT-ALIGNED: the weight-400 name (`title`) over
 * a muted `tagline`, with **no call-to-action buttons**
 * (the config's `actions` data is intentionally not
 * rendered here). Each `feature` becomes a FLAT card
 * (`bg-bg-soft`, rounded, no border/hover-lift).
 * Presentation — the left hero and the responsive card
 * grid — is owned by {@link baseCss} via the `.vp-hero` /
 * `.vp-features` classes, so any consumer's home data
 * renders without theme changes.
 */
export const homeHero = (
  home: HomeConfig,
): Html<never, "section"> => {
  const feature = (
    item: HomeFeature,
  ): Html<never, "div"> =>
    div(
      [class_("vp-feature")],
      [
        h3(
          [class_("vp-feature-title")],
          [text(item.title)],
        ),
        p(
          [class_("vp-feature-text")],
          [text(item.details)],
        ),
      ],
    );
  return section(
    [class_("vp-hero-wrap")],
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
        ],
      ),
      div(
        [class_("vp-features")],
        home.features.map((item) => feature(item)),
      ),
    ],
  );
};
