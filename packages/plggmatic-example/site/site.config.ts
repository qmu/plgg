import { pages } from "../src/catalog/pages.ts";
import { addressOf } from "../src/site/pagePart.ts";
import { HOME } from "../src/catalog/address.ts";

// The guide's sidebar is the catalog's own: its groups in
// the order its pages are written, so the site and the
// catalog cannot list different things.
const groups = pages.reduce<
  ReadonlyArray<
    Readonly<{
      text: string;
      items: ReadonlyArray<
        Readonly<{
          text: string;
          link: string;
          items: ReadonlyArray<never>;
        }>
      >;
    }>
  >
>(
  (all, page) =>
    all.some((g) => g.text === page.group)
      ? all.map((g) =>
          g.text === page.group
            ? {
                ...g,
                items: [
                  ...g.items,
                  {
                    text: page.title,
                    link:
                      page.id === HOME
                        ? "/"
                        : addressOf(page.id),
                    items: [],
                  },
                ],
              }
            : g,
        )
      : [
          ...all,
          {
            text: page.group,
            items: [
              {
                text: page.title,
                link:
                  page.id === HOME
                    ? "/"
                    : addressOf(page.id),
                items: [],
              },
            ],
          },
        ],
  [],
);

export default {
  title: "plggmatic",
  description:
    "横に並ぶ列で画面を組む UI フレームワーク。",
  base: "/",
  nav: [],
  sidebarStyle: "tree",
  sidebarGroups: "toggle",
  controls: "sidebar",
  contentWidth: "fill",
  sidebar: groups,
  social: [],
  dev: { allowedHosts: [] },
  // The sites this guide is joined to by columns. qmu.co.jp
  // may open these pages as columns, and a link here to
  // qmu.co.jp opens beside.
  partners: ["https://qmu.co.jp"],
  embedders: ["https://qmu.co.jp"],
};
