import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { some, none } from "plgg";
import { renderToString } from "plgg-view";
import { defaultTheme } from "plggmatic/Style";
import {
  type NavGroup,
  sidebarNav,
  sidebarNavCss,
  sidebarNavRevealScript,
} from "plggmatic/Component/usecase/sidebarNav";

const groups: ReadonlyArray<NavGroup> = [
  {
    label: "Guide",
    items: [
      {
        label: "Start",
        href: some("/start"),
        children: [],
      },
      {
        label: "Soon",
        href: none(),
        children: [],
      },
    ],
  },
  {
    label: "Reference",
    items: [
      {
        label: "Concepts",
        href: none(),
        children: [
          {
            label: "Option",
            href: some("/concepts/option"),
            children: [],
          },
        ],
      },
    ],
  },
];

const render = (
  toggle: boolean,
  numbered: boolean,
  at: string,
) =>
  renderToString(
    sidebarNav({
      groups,
      resolve: (href) => "/base" + href,
      current: (href) => href === at,
      toggle,
      numbered,
      label: "Sidebar navigation",
    }),
  );

test("always-open groups are plain headers with no disclosure and no script", () => {
  const html = render(false, false, "/start");
  return all([
    check(
      html,
      toContain('class="pm-nav-group-title"'),
    ),
    check(html, not(toContain("<details"))),
    check(html, not(toContain("<script"))),
    check(
      html,
      toContain(
        'aria-label="Sidebar navigation"',
      ),
    ),
  ]);
});

test("links go through the host's resolver and exactly the current one is marked", () => {
  const html = render(false, false, "/start");
  return all([
    check(html, toContain('href="/base/start"')),
    check(
      html,
      toContain('href="/base/concepts/option"'),
    ),
    check(
      html.split('aria-current="page"').length,
      toBe(2),
    ),
    check(html, toContain('class="pm-nav-flat"')),
    check(
      html,
      toContain('class="pm-nav-subgroup-title"'),
    ),
  ]);
});

test("toggle groups are named disclosures, open only where the current page lives - also when it is nested", () => {
  const html = render(
    true,
    true,
    "/concepts/option",
  );
  const opened = html.split("<details").slice(1);
  return all([
    check(opened.length, toBe(2)),
    check(
      opened
        .map((d) =>
          d.split(">")[0]!.includes("open"),
        )
        .join(),
      toBe("false,true"),
    ),
    // groups open independently: none carries a shared
    // `name`, which would close the others (an accordion)
    check(
      opened.some((d) =>
        d.split(">")[0]!.includes("name="),
      ),
      toBe(false),
    ),
  ]);
});

test("numbered rows are asked for on the nav itself", () =>
  check(
    render(false, true, "/start"),
    toContain('class="pm-nav pm-nav-numbered"'),
  ));

test("the stylesheet and the reveal statement survive an SSR text escaper", () => {
  const css = sidebarNavCss(defaultTheme);
  return all([
    check(/[<>&]/.test(css), toBe(false)),
    check(
      css,
      toContain(".pm-nav-link[aria-current]"),
    ),
    check(
      sidebarNavRevealScript.includes("</script"),
      toBe(false),
    ),
  ]);
});
