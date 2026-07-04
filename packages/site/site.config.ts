// plggmatic's documentation-site information
// architecture: pure data validated through plggpress's
// `defineSite` boundary caster (the one place untrusted
// config crosses into the typed core). plggpress owns the
// `SiteConfig` type and the validator; this file supplies
// only plggmatic's values, cloned from the plgg guide's
// shape.
import {
  defineSite,
  type SidebarItemInput,
} from "plggpress";

// GitHub Pages serves a project site under `/<repo>/`; the
// deploy workflow sets DOCS_BASE so links resolve there,
// while local dev/preview stay at root. plggpress's href
// resolver is the single rewrite point downstream.
const base = process.env.DOCS_BASE ?? "/";

// A sidebar node as authored here: every node carries an
// explicit `items` array (leaf case `[]`) so it validates
// against plggpress's `SidebarItemInput`.
const leaf = (
  text: string,
  link: string,
): SidebarItemInput => ({
  text,
  link,
  items: [],
});

// One leaf per shipped fundamental component (each has its
// own documented page with a compiling example).
const COMPONENTS: ReadonlyArray<
  readonly [string, string]
> = [
  ["Button", "/components/button"],
  ["Text link", "/components/text-link"],
  ["Typography", "/components/typography"],
  ["Theme toggle", "/components/theme-toggle"],
  ["Nav tree", "/components/nav-tree"],
];

const config = {
  base,
  title: "plggmatic",
  description:
    "plggmatic — a column-oriented UI design " +
    "framework on the plgg family: pane alignment, " +
    "a typed light/dark color scheme, and " +
    "fundamental components as pure functions " +
    "returning plgg-view Html.",
  nav: [
    leaf("Guide", "/getting-started"),
    leaf("Components", "/components/button"),
    leaf(
      "GitHub",
      "https://github.com/qmu/plgg",
    ),
  ],
  sidebar: [
    {
      text: "Guide",
      items: [
        leaf("What is plggmatic?", "/"),
        leaf(
          "Getting started",
          "/getting-started",
        ),
        leaf(
          "Example: the workbench",
          "/workbench",
        ),
      ],
    },
    {
      text: "Foundations",
      items: [
        leaf("Color scheme", "/color-scheme"),
        leaf("Pane alignment", "/pane-alignment"),
      ],
    },
    {
      text: "Components",
      items: COMPONENTS.map(([t, l]) =>
        leaf(t, l),
      ),
    },
  ],
  social: [
    {
      icon: "github",
      link: "https://github.com/qmu/plgg",
    },
  ],
  // The extra Host headers plggpress's node:http dev
  // server accepts: localhost for local work, the qmu.dev
  // tunnel host for remote preview.
  dev: {
    allowedHosts: [
      "localhost",
      "plggmatic-guide.qmu.dev",
    ],
  },
};

// Author-time validation through the boundary caster: an
// Ok is the typed `SiteConfig`, an Err names the offending
// field. Exported so a check / plggpress can assert it.
export const site = defineSite(config);

// The raw config DATA is the default export plggpress's
// `loadConfig` reads and validates through `defineSite` at
// build/dev time.
export default config;
