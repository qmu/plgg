import {
  test,
  check,
  all,
  toContain,
  not,
} from "plgg-test";
import { renderToString } from "plgg-view";
import { type HomeConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { homeHero } from "plgg-press/theme/homeHero";

// Arbitrary consumer data — the theme must render it
// generically, hard-coding none of these strings.
const home: HomeConfig = {
  title: "Acme Docs",
  tagline: "Everything you need, fast.",
  actions: [
    { text: "Get started", link: "/start" },
    {
      text: "GitHub",
      link: "https://github.com/acme/acme",
    },
  ],
  features: [
    {
      title: "Typed end to end",
      details: "No escape hatches anywhere.",
    },
    {
      title: "Zero config",
      details: "It just works out of the box.",
    },
    {
      title: "Tiny output",
      details: "Ships only what you use.",
    },
  ],
};

const rendered = renderToString(homeHero(home));

test("renders the hero title and tagline from data", () =>
  all([
    check(rendered, toContain(">Acme Docs<")),
    check(
      rendered,
      toContain("Everything you need, fast."),
    ),
    // the name is the weight-400 hero title
    check(
      rendered,
      toContain('class="vp-hero-title"'),
    ),
  ]));

test("renders NO call-to-action buttons (qmu: no CTA)", () =>
  all([
    // the action data is intentionally not rendered
    check(rendered, not(toContain("vp-action"))),
    check(
      rendered,
      not(toContain('href="/docs/start"')),
    ),
    check(rendered, not(toContain(">Get started<"))),
  ]));

test("renders the feature grid generically from injected data", () =>
  all([
    check(
      rendered,
      toContain(">Typed end to end<"),
    ),
    check(
      rendered,
      toContain("No escape hatches anywhere."),
    ),
    check(rendered, toContain(">Zero config<")),
    check(rendered, toContain(">Tiny output<")),
    check(
      rendered,
      toContain("Ships only what you use."),
    ),
  ]));
