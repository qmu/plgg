import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { some, none } from "plgg";
import {
  slugify,
  githubSlugify,
  plainHighlighter,
  identityResolver,
} from "plgg-md";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import {
  rawHtmlOf,
  sluggerOf,
  pressRenderOptions,
} from "plggpress/SiteConfig/usecase/renderSeams";

/** A base config with the two render knobs left to override. */
const config = (
  overrides: Partial<SiteConfig>,
): SiteConfig => ({
  title: "T",
  description: "D",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
  models: none(),
  rawHtml: none(),
  slugger: none(),
  srcExclude: none(),
  linkIgnore: none(),
  theme: none(),
  ...overrides,
});

test("rawHtmlOf defaults to false, honors Some(true)", () =>
  all([
    check(rawHtmlOf(config({})), toBe(false)),
    check(
      rawHtmlOf(config({ rawHtml: some(true) })),
      toBe(true),
    ),
  ]));

test("sluggerOf defaults to the VitePress slugify", () =>
  check(
    sluggerOf(config({})) === slugify,
    toBe(true),
  ));

test("sluggerOf resolves the github kind to githubSlugify", () =>
  check(
    sluggerOf(
      config({ slugger: some("github") }),
    ) === githubSlugify,
    toBe(true),
  ));

test("sluggerOf resolves an explicit vitepress kind to slugify", () =>
  check(
    sluggerOf(
      config({ slugger: some("vitepress") }),
    ) === slugify,
    toBe(true),
  ));

test("pressRenderOptions folds the config knobs plus the supplied seams", () => {
  const opts = pressRenderOptions(
    config({
      rawHtml: some(true),
      slugger: some("github"),
    }),
    plainHighlighter,
    identityResolver,
  );
  return all([
    check(opts.rawHtml, toBe(true)),
    check(
      opts.slug === githubSlugify,
      toBe(true),
    ),
    check(
      opts.highlighter === plainHighlighter,
      toBe(true),
    ),
    check(
      opts.resolveLink === identityResolver,
      toBe(true),
    ),
  ]);
});
