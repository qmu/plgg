import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
  errThen,
} from "plgg-test";
import {
  type SiteConfig,
  type SiteConfigInput,
  asSiteConfig,
  defineSite,
} from "plggpress/SiteConfig/model/SiteConfig";

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
