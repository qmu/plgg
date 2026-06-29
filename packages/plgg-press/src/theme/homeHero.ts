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
} from "plgg-view";
import {
  style_,
  flex,
  flexCol,
  wrap,
  grow,
  gap,
  px,
  py,
  p as pad,
  mb,
  minW,
  maxW,
  center,
  weight,
  color,
  bg,
  border,
  rounded,
  text as fontSize,
} from "plgg-view/style";
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
 * call-to-action link (routed through {@link href} so the
 * deploy `base` applies once); the feature grid maps
 * every `feature` to a card. Built from the curated
 * flex/wrap atomic utilities (plgg-view ships no
 * grid-template utility yet — the wrapping flex row is the
 * v1 grid), so any consumer's home data renders without
 * theme changes.
 */
export const homeHero = (
  home: HomeConfig,
  base: SoftStr,
): Html<never, "section"> => {
  const hrefOf = href(base);
  const action = (
    item: HomeAction,
  ): Html<never, "a"> =>
    a(
      [
        attr("href", hrefOf(item.link)),
        style_(
          px(4),
          py(2),
          rounded("md"),
          bg("primary"),
          color("primary-text"),
          weight(600),
        ),
      ],
      [text(item.text)],
    );
  const feature = (
    item: HomeFeature,
  ): Html<never, "div"> =>
    div(
      [
        style_(
          flexCol,
          grow,
          minW(56),
          border,
          rounded("md"),
          pad(4),
          bg("surface"),
        ),
      ],
      [
        h3(
          [style_(fontSize("lg"), mb(2))],
          [text(item.title)],
        ),
        p(
          [style_(color("muted"))],
          [text(item.details)],
        ),
      ],
    );
  return section(
    [style_(maxW(240), py(12), px(4))],
    [
      h1(
        [
          style_(
            fontSize("2xl"),
            weight(700),
            center,
            mb(4),
          ),
        ],
        [text(home.title)],
      ),
      p(
        [
          style_(
            fontSize("lg"),
            color("muted"),
            center,
            mb(8),
          ),
        ],
        [text(home.tagline)],
      ),
      div(
        [
          style_(
            flex,
            wrap,
            gap(3),
            center,
            mb(12),
          ),
        ],
        home.actions.map((item) => action(item)),
      ),
      div(
        [style_(flex, wrap, gap(4))],
        home.features.map((item) =>
          feature(item),
        ),
      ),
    ],
  );
};
