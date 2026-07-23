import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
  errThen,
} from "plgg-test";
import { isSome } from "plgg";
import {
  type SiteConfig,
  type SiteConfigInput,
  asSiteConfig,
  asSluggerKind,
  defineSite,
} from "plggpress/SiteConfig/model/SiteConfig";

test("asSluggerKind accepts the closed set, rejects others", () =>
  all([
    check(
      asSluggerKind("vitepress"),
      okThen(toBe("vitepress")),
    ),
    check(
      asSluggerKind("github"),
      okThen(toBe("github")),
    ),
    check(asSluggerKind("mdit"), shouldBeErr()),
    check(asSluggerKind(3), shouldBeErr()),
  ]));

test("asSiteConfig omitting rawHtml/slugger yields the defaults (None)", () =>
  check(
    asSiteConfig({
      title: "t",
      description: "d",
      base: "/",
      nav: [],
      sidebar: [],
      social: [],
      dev: { allowedHosts: [] },
    }),
    okThen((c: SiteConfig) =>
      all([
        toBe(false)(isSome(c.rawHtml)),
        toBe(false)(isSome(c.slugger)),
      ]),
    ),
  ));

test("asSiteConfig validates supplied rawHtml/slugger", () =>
  check(
    asSiteConfig({
      title: "t",
      description: "d",
      base: "/",
      nav: [],
      sidebar: [],
      social: [],
      dev: { allowedHosts: [] },
      rawHtml: true,
      slugger: "github",
    }),
    okThen((c: SiteConfig) =>
      all([
        toBe(true)(
          isSome(c.rawHtml) &&
            c.rawHtml.content === true,
        ),
        toBe(true)(
          isSome(c.slugger) &&
            c.slugger.content === "github",
        ),
      ]),
    ),
  ));

test("asSiteConfig decodes srcExclude/linkIgnore, defaulting to None", () =>
  all([
    check(
      asSiteConfig({
        title: "t",
        description: "d",
        base: "/",
        nav: [],
        sidebar: [],
        social: [],
        dev: { allowedHosts: [] },
      }),
      okThen((c: SiteConfig) =>
        all([
          toBe(false)(isSome(c.srcExclude)),
          toBe(false)(isSome(c.linkIgnore)),
        ]),
      ),
    ),
    check(
      asSiteConfig({
        title: "t",
        description: "d",
        base: "/",
        nav: [],
        sidebar: [],
        social: [],
        dev: { allowedHosts: [] },
        srcExclude: ["/drafts/**"],
        linkIgnore: ["/downloads/**"],
      }),
      okThen((c: SiteConfig) =>
        all([
          toBe(true)(
            isSome(c.srcExclude) &&
              c.srcExclude.content[0] ===
                "/drafts/**",
          ),
          toBe(true)(
            isSome(c.linkIgnore) &&
              c.linkIgnore.content[0] ===
                "/downloads/**",
          ),
        ]),
      ),
    ),
  ]));

const valid = {
  title: "plgg",
  description: "The official guide.",
  base: "/plgg/",
  nav: [
    {
      text: "Guide",
      link: "/getting-started",
    },
  ],
  sidebar: [
    {
      text: "Guide",
      items: [
        {
          text: "Getting started",
          link: "/getting-started",
          items: [
            {
              text: "Install",
              link: "/install",
              items: [],
            },
          ],
        },
      ],
    },
  ],
  social: [
    {
      icon: "github",
      link: "https://github.com/qmu/plgg",
    },
  ],
  dev: {
    allowedHosts: ["plgg-guide.qmu.dev"],
  },
};

test("defineSite accepts a valid config with allowedHosts", () =>
  check(
    defineSite(valid),
    okThen((c: SiteConfig) =>
      all([
        toBe("plgg")(c.title),
        toBe("/plgg/")(c.base),
        toBe(1)(c.nav.length),
        toBe("plgg-guide.qmu.dev")(
          c.dev.allowedHosts[0] ?? "",
        ),
      ]),
    ),
  ));

test("defineSite rejects a malformed config with an InvalidError", () =>
  all([
    check(
      asSiteConfig({ title: 123 }),
      shouldBeErr(),
    ),
    check(
      asSiteConfig({ title: 123 }),
      errThen((e) =>
        toBe("InvalidError")(e.__tag),
      ),
    ),
    check(asSiteConfig(null), shouldBeErr()),
  ]));

test("defineSite accepts a minimal typed input", () => {
  const input: SiteConfigInput = {
    title: "t",
    description: "d",
    base: "/",
    nav: [],
    sidebar: [],
    social: [],
    dev: { allowedHosts: [] },
  };
  return check(
    defineSite(input),
    okThen((c: SiteConfig) =>
      all([
        toBe("t")(c.title),
        toBe("/")(c.base),
      ]),
    ),
  );
});
