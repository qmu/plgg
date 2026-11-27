import { joinedTo } from "../../../sites.ts";
import type { SiteConfigInput } from "plggpress";
import { pagesFor } from "../src/catalog/pages.ts";
import {
  baseOf,
  labels,
  localeOf,
} from "../src/catalog/locale.ts";
import { routeOf } from "../src/site/pagePart.ts";

const locale = localeOf(process.env.SITE_LOCALE);
const label = labels(locale);
const pages = pagesFor(locale);
const sections = [
  ...new Set(pages.map((page) => page.group)),
];
export default {
  title: label(
    "plggmatic ガイド",
    "The plggmatic guide",
  ),
  description: label(
    "ページを横に並べた画面を組み、列の中で部品を試せます。",
    "Build a column-based interface and try its components in place.",
  ),
  base: baseOf(locale),
  nav: [],
  sidebarStyle: "tree",
  sidebarGroups: "toggle",
  controls: "sidebar",
  contentWidth: "fill",
  sidebar: [
    ...sections.map((text) => ({
      text,
      items: pages
        .filter((page) => page.group === text)
        .map((page) => ({
          text: page.title,
          link: routeOf(page.id),
          items: [],
        })),
    })),
    {
      text: label("言語", "Language"),
      items: [
        {
          text: label("English", "日本語"),
          link: label("/en/", "/../"),
          items: [],
        },
      ],
    },
  ],
  social: [],
  dev: { allowedHosts: [] },
  ...joinedTo("https://plggmatic.qmu.co.jp"),
} satisfies SiteConfigInput;
