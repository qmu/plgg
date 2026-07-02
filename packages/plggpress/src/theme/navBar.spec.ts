import {
  test,
  check,
  all,
  toContain,
  not,
} from "plgg-test";
import { none } from "plgg";
import { renderToString } from "plggmatic";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import {
  chromeRail,
  mobileBar,
} from "plggpress/theme/navBar";

const config: SiteConfig = {
  title: "plgg Guide",
  description: "The plgg static guide",
  base: "/plgg/",
  nav: [],
  sidebar: [],
  social: [
    {
      icon: "github",
      link: "https://github.com/qmu/plgg",
    },
  ],
  home: none(),
  dev: { allowedHosts: [] },
};

const rail = renderToString(chromeRail(config));

test("chrome rail carries the appearance toggle and social links, no nav", () =>
  all([
    check(rail, toContain('class="vp-rail"')),
    check(
      rail,
      toContain('class="vp-theme-toggle"'),
    ),
    check(rail, toContain("vp-sun")),
    check(rail, toContain("vp-moon")),
    // the GitHub social link with an accessible label
    check(rail, toContain("vp-rail-social")),
    check(
      rail,
      toContain(
        'href="https://github.com/qmu/plgg"',
      ),
    ),
    check(rail, toContain('aria-label="GitHub"')),
    // the rail is chrome, not a navigation landmark
    check(rail, not(toContain("<nav"))),
  ]));

const barContent = renderToString(
  mobileBar(config, "/getting-started", true),
);

test("mobile bar shows the ☰ menu button, wordmark home link, and toggle", () =>
  all([
    check(
      barContent,
      toContain('class="vp-mobilebar"'),
    ),
    // the CSS-only drawer control targets the checkbox
    check(
      barContent,
      toContain('for="vp-menu-toggle"'),
    ),
    // the wordmark links to the base root
    check(barContent, toContain('href="/plgg/"')),
    check(barContent, toContain(">plgg Guide<")),
    check(
      barContent,
      toContain('class="vp-theme-toggle"'),
    ),
  ]));

test("mobile bar marks the wordmark current on the home route", () =>
  check(
    renderToString(mobileBar(config, "/", true)),
    toContain('aria-current="page"'),
  ));

test("mobile bar off the home route marks nothing current", () =>
  check(
    renderToString(
      mobileBar(config, "/getting-started", true),
    ),
    not(toContain('aria-current="page"')),
  ));

test("mobile bar omits the ☰ button when the page has no drawer", () =>
  check(
    renderToString(
      mobileBar(config, "/404", false),
    ),
    not(toContain('for="vp-menu-toggle"')),
  ));
