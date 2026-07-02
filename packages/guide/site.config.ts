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

// One top-level sidebar group per package. The group header
// links to nothing itself; its child is the package's prose
// Guide. Order: the featured trio (plgg, plgg-http,
// plgg-router) first, then the rest, then the example
// tutorial.
type PackageGroup = {
  key: string;
  text: string;
  overview: string;
  docs?: ReadonlyArray<SidebarItemInput>;
};

const PACKAGE_GROUPS: ReadonlyArray<PackageGroup> =
  [
    {
      key: "plgg",
      text: "plgg (core)",
      overview: "/packages/plgg/",
      docs: [
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
      key: "plgg-http",
      text: "plgg-http",
      overview: "/packages/plgg-http",
    },
    {
      key: "plgg-router",
      text: "plgg-router",
      overview: "/packages/plgg-router",
    },
    {
      key: "plgg-server",
      text: "plgg-server",
      overview: "/packages/plgg-server",
    },
    {
      key: "plgg-fetch",
      text: "plgg-fetch",
      overview: "/packages/plgg-fetch",
    },
    {
      key: "plgg-view",
      text: "plgg-view",
      overview: "/packages/plgg-view",
    },
    {
      key: "plgg-sql",
      text: "plgg-sql",
      overview: "/packages/plgg-sql",
    },
    {
      key: "plgg-db-migration",
      text: "plgg-db-migration",
      overview: "/packages/plgg-db-migration",
    },
    {
      key: "plgg-kit",
      text: "plgg-kit",
      overview: "/packages/plgg-kit",
    },
    {
      key: "plgg-foundry",
      text: "plgg-foundry",
      overview: "/packages/plgg-foundry",
    },
    {
      key: "plgg-cli",
      text: "plgg-cli",
      overview: "/packages/plgg-cli",
    },
    {
      key: "plgg-md",
      text: "plgg-md",
      overview: "/packages/plgg-md",
    },
    {
      key: "plgg-highlight",
      text: "plgg-highlight",
      overview: "/packages/plgg-highlight",
    },
    {
      key: "plgg-bundle",
      text: "plgg-bundle",
      overview: "/packages/plgg-bundle",
    },
    {
      key: "plggmatic",
      text: "plggmatic",
      overview: "/packages/plggmatic",
    },
    {
      key: "plggpress",
      text: "plggpress",
      overview: "/packages/plggpress",
    },
    {
      key: "plgg-test",
      text: "plgg-test",
      overview: "/packages/plgg-test",
    },
    {
      key: "example",
      text: "example (tutorial)",
      overview: "/packages/example",
    },
  ];

// The "Guide" node spliced at the START of a package group:
// the package's prose. With extra prose pages (only plgg
// core today) it nests them beneath the Overview; otherwise
// it is a plain link to the single prose page.
const guideNode = (
  group: PackageGroup,
): SidebarItemInput => {
  const docs = group.docs ?? [];
  return {
    text: "Guide",
    link: group.overview,
    items: docs,
  };
};

// Assemble one package's top-level sidebar group: its prose
// Guide.
const packageGroup = (
  group: PackageGroup,
): {
  text: string;
  items: ReadonlyArray<SidebarItemInput>;
} => ({
  text: group.text,
  items: [guideNode(group)],
});

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
      ],
    },
    ...PACKAGE_GROUPS.map(packageGroup),
    {
      text: "Contributing",
      items: [
        leaf(
          "Doc conventions",
          "/contributing/conventions",
        ),
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
