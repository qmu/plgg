// The guide's single information-architecture
// instance: pure data validated through plggpress's
// `defineSite` boundary caster. This replaces the old
// VitePress `defineConfig` — there is deliberately no
// dependency on the `vitepress` package here. plggpress
// owns the
// `SiteConfig` TYPE and the `defineSite` validator; this
// file supplies only the guide's values (ported verbatim
// from the former `.vitepress/config.ts` and `index.md`).
import {
  defineSite,
  type SidebarItemInput,
} from "plggpress";

// GitHub Pages serves a project site under `/<repo>/`; the
// deploy workflow sets DOCS_BASE so links resolve there,
// while local dev/preview stay at root. plggpress's href
// helper is the single rewrite site downstream.
const base = process.env.DOCS_BASE ?? "/";

// A sidebar node as authored here: every node carries an
// explicit `items` array (the leaf case is `[]`) so it
// validates against plggpress's `SidebarItemInput`, whose
// `items` is required and whose `link` is optional.
const leaf = (
  text: string,
  link: string,
): SidebarItemInput => ({
  text,
  link,
  items: [],
});

// The five sidebar sections (developer's IA, 2026-07-03):
// Guide (prose), Core (plgg + its deep-dive pages),
// Library (every mid/toolchain package, one leaf each, in
// dependency-ish order, closing with the example tutorial),
// then the framework (plggmatic) and the site tool
// (plggpress), each with its single Overview page.
const LIBRARY_PACKAGES: ReadonlyArray<
  readonly [string, string]
> = [
  ["plgg-http", "/packages/plgg-http"],
  ["plgg-router", "/packages/plgg-router"],
  ["plgg-server", "/packages/plgg-server"],
  ["plgg-fetch", "/packages/plgg-fetch"],
  ["plgg-view", "/packages/plgg-view"],
  ["plgg-sql", "/packages/plgg-sql"],
  [
    "plgg-db-migration",
    "/packages/plgg-db-migration",
  ],
  ["plgg-kit", "/packages/plgg-kit"],
  ["plgg-foundry", "/packages/plgg-foundry"],
  ["plgg-cli", "/packages/plgg-cli"],
  ["plgg-md", "/packages/plgg-md"],
  ["plgg-highlight", "/packages/plgg-highlight"],
  ["plgg-bundle", "/packages/plgg-bundle"],
  ["plgg-test", "/packages/plgg-test"],
  ["example (tutorial)", "/packages/example"],
];

// Information architecture for the plgg family guide: the
// nav and sidebar tree below name every page, ported
// verbatim from the former `.vitepress/config.ts`.
const config = {
  base,
  title: "plgg",
  description:
    "The official guide for plgg and the " +
    "plgg family — a TypeScript toolkit where " +
    "web development is one typed pipeline: " +
    "Option/Result, errors as data, " +
    "runtime-neutral, built from scratch.",
  nav: [
    leaf("Guide", "/getting-started"),
    leaf("Packages", "/packages/plgg/"),
    leaf("GitHub", "https://github.com/qmu/plgg"),
  ],
  sidebar: [
    {
      text: "Guide",
      items: [
        leaf(
          "Getting started",
          "/getting-started",
        ),
        {
          text: "Core concepts",
          link: "/concepts/",
          items: [
            leaf(
              "Tagged data (Box)",
              "/concepts/tagged-data",
            ),
            leaf(
              "Option, not null",
              "/concepts/option",
            ),
            leaf(
              "Result, not throw",
              "/concepts/result",
            ),
            leaf(
              "Validation with cast",
              "/concepts/validation",
            ),
            leaf(
              "Async with proc",
              "/concepts/async",
            ),
            leaf(
              "Exhaustive match",
              "/concepts/match",
            ),
            leaf(
              "Data-last composition",
              "/concepts/composition",
            ),
          ],
        },
        leaf(
          "Doc conventions",
          "/contributing/conventions",
        ),
      ],
    },
    {
      text: "Core",
      items: [
        leaf("plgg", "/packages/plgg/"),
        leaf(
          "Values & effects",
          "/packages/plgg/values-effects",
        ),
        leaf(
          "Structures & errors",
          "/packages/plgg/structures-errors",
        ),
      ],
    },
    {
      text: "Library",
      items: LIBRARY_PACKAGES.map(([t, l]) =>
        leaf(t, l),
      ),
    },
    {
      text: "plggmatic",
      items: [
        leaf("Overview", "/packages/plggmatic"),
      ],
    },
    {
      text: "plggpress",
      items: [
        leaf("Overview", "/packages/plggpress"),
      ],
    },
  ],
  social: [
    {
      icon: "github",
      link: "https://github.com/qmu/plgg",
    },
  ],
  // dev.allowedHosts (spike item 7): the extra Host headers
  // plggpress's node:http dev server accepts. localhost for
  // local work; plgg-guide.qmu.dev for the port-5181
  // Cloudflare tunnel.
  dev: {
    allowedHosts: [
      "localhost",
      "plgg-guide.qmu.dev",
    ],
  },
};

// Author-time validation through the boundary caster: an Ok
// is the typed `SiteConfig`, an Err names the offending
// field. Exported so a check / plggpress can assert it.
export const site = defineSite(config);

// The raw config DATA is the default export plggpress's
// `loadConfig` reads and validates through `defineSite` at
// build/dev time (the one place untrusted config crosses
// into the typed core).
export default config;
