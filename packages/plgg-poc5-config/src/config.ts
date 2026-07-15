/**
 * The PURE HEART of PoC 5 — the site's CENTRAL
 * CONFIGURATION as typed data. This is the "generated
 * data the site renders" the mission asks the writer's
 * agent to maintain: the tag classification (name / color
 * / emoji / description), the path exclusions, and the
 * two presentation dials (layout + a prefixed sizing
 * theme). Every dial is a CLOSED union rendered with an
 * exhaustive switch, so an unhandled value is a compile
 * error, never a broken render — the durable-core
 * guarantee the plggpress vision leans on.
 *
 * This module is total and pure (no DOM, no fs, no
 * network): the model, the catalogs the picker offers,
 * the label/scale lookups the view reads, and the
 * string → union guards the command parser and wire
 * casters share. The op APPLIER lives in apply.ts; the
 * page derivation the config classifies lives in pages.ts.
 */
import {
  type SoftStr,
  type Option,
  some,
  none,
} from "plgg";

/**
 * The minimal 5–7-color scheme the roadmap fixes for the
 * plggmatic design system: primary + success/danger/
 * warning/info (5), plus secondary/tertiary (7). A tag is
 * classified into exactly one of these semantic hues, so
 * the palette stays small and legible in both themes.
 */
export type TagColor =
  | "primary"
  | "secondary"
  | "tertiary"
  | "success"
  | "danger"
  | "warning"
  | "info";

/** Every color, in catalog order (the picker's options). */
export const TAG_COLORS: ReadonlyArray<TagColor> =
  [
    "primary",
    "secondary",
    "tertiary",
    "success",
    "danger",
    "warning",
    "info",
  ];

/**
 * The hex a color renders as — chosen to read on both the
 * light and the dark surface (mid-tone, high-chroma). The
 * exhaustive switch is the single source; adding a color
 * to the union without a hex is a compile error.
 */
export const colorHex = (
  color: TagColor,
): SoftStr => {
  switch (color) {
    case "primary":
      return "#2563eb";
    case "secondary":
      return "#7c3aed";
    case "tertiary":
      return "#0d9488";
    case "success":
      return "#16a34a";
    case "danger":
      return "#dc2626";
    case "warning":
      return "#d97706";
    case "info":
      return "#0284c7";
  }
};

/**
 * The prefixed sizing themes — the ~5–10 the confidence
 * signal asks to be expressible. The `sz-` prefix is the
 * "prefixed sizing theme" convention from the roadmap; the
 * scale rises monotonically from compact to grand.
 */
export type SizingTheme =
  | "sz-compact"
  | "sz-cozy"
  | "sz-comfortable"
  | "sz-relaxed"
  | "sz-spacious"
  | "sz-airy"
  | "sz-grand";

/** Every sizing theme, compact → grand (the picker order). */
export const SIZING_THEMES: ReadonlyArray<SizingTheme> =
  [
    "sz-compact",
    "sz-cozy",
    "sz-comfortable",
    "sz-relaxed",
    "sz-spacious",
    "sz-airy",
    "sz-grand",
  ];

/** The concrete sizes a theme maps to (px), read by the view. */
export type SizingScale = Readonly<{
  basePx: number;
  gapPx: number;
  padPx: number;
}>;

/** The exhaustive theme → scale lookup (single source). */
export const sizingScale = (
  theme: SizingTheme,
): SizingScale => {
  switch (theme) {
    case "sz-compact":
      return { basePx: 13, gapPx: 4, padPx: 8 };
    case "sz-cozy":
      return { basePx: 14, gapPx: 6, padPx: 10 };
    case "sz-comfortable":
      return { basePx: 15, gapPx: 8, padPx: 12 };
    case "sz-relaxed":
      return { basePx: 16, gapPx: 11, padPx: 15 };
    case "sz-spacious":
      return { basePx: 17, gapPx: 14, padPx: 18 };
    case "sz-airy":
      return { basePx: 18, gapPx: 18, padPx: 22 };
    case "sz-grand":
      return { basePx: 20, gapPx: 24, padPx: 28 };
  }
};

/** The human label a theme shows in the picker/preview. */
export const sizingThemeLabel = (
  theme: SizingTheme,
): SoftStr => {
  switch (theme) {
    case "sz-compact":
      return "Compact";
    case "sz-cozy":
      return "Cozy";
    case "sz-comfortable":
      return "Comfortable";
    case "sz-relaxed":
      return "Relaxed";
    case "sz-spacious":
      return "Spacious";
    case "sz-airy":
      return "Airy";
    case "sz-grand":
      return "Grand";
  }
};

/**
 * The page layout — the roadmap's two screen modes
 * (single-column one-operation-per-screen, multi-column
 * panes) plus a wide reading variant. A closed union, so
 * the layout switch is total.
 */
export type Layout =
  | "single-column"
  | "multi-column"
  | "wide";

/** Every layout, in catalog order. */
export const LAYOUTS: ReadonlyArray<Layout> = [
  "single-column",
  "multi-column",
  "wide",
];

/** The human label a layout shows. */
export const layoutLabel = (
  layout: Layout,
): SoftStr => {
  switch (layout) {
    case "single-column":
      return "Single column";
    case "multi-column":
      return "Multi column";
    case "wide":
      return "Wide";
  }
};

/** How many columns a layout renders the doc grid in. */
export const layoutColumns = (
  layout: Layout,
): number => {
  switch (layout) {
    case "single-column":
      return 1;
    case "multi-column":
      return 3;
    case "wide":
      return 2;
  }
};

/**
 * One tag's classification: the slug it is keyed by (which
 * a page's derived tag matches), and the display identity
 * the writer maintains — name, color, emoji, description.
 */
export type TagDef = Readonly<{
  slug: SoftStr;
  name: SoftStr;
  color: TagColor;
  emoji: SoftStr;
  description: SoftStr;
}>;

/**
 * The whole central configuration — the one typed value
 * the agent maintains and the sample site renders. Tags
 * classify pages, exclusions hide paths, and the two dials
 * restyle the layout and sizing.
 */
export type Config = Readonly<{
  tags: ReadonlyArray<TagDef>;
  exclusions: ReadonlyArray<SoftStr>;
  layout: Layout;
  sizingTheme: SizingTheme;
}>;

/* ------------------------------------------------ *
 * string → union guards (shared by command + wire)  *
 * ------------------------------------------------ */

/**
 * Is `raw` one of `catalog`'s literals? A user-defined
 * type guard so the caller narrows `SoftStr` to the member
 * type without any cast — the no-escape-hatch spelling of
 * "this string names a union member".
 */
const oneOf = <T extends string>(
  catalog: ReadonlyArray<T>,
  raw: SoftStr,
): raw is T => catalog.some((c) => c === raw);

/** A raw string → a TagColor, if it names one. */
export const asTagColor = (
  raw: SoftStr,
): Option<TagColor> =>
  oneOf(TAG_COLORS, raw) ? some(raw) : none();

/** A raw string → a SizingTheme, if it names one. */
export const asSizingTheme = (
  raw: SoftStr,
): Option<SizingTheme> =>
  oneOf(SIZING_THEMES, raw) ? some(raw) : none();

/** A raw string → a Layout, if it names one. */
export const asLayout = (
  raw: SoftStr,
): Option<Layout> =>
  oneOf(LAYOUTS, raw) ? some(raw) : none();

/**
 * The site's starting configuration — the seeded classes
 * for the guide corpus's directory-derived tags (see
 * pages.ts), a comfortable sizing theme, and the
 * single-column layout. "Reclassify a tag" edits one of
 * these; the config is the durable data the demo mutates.
 */
export const DEFAULT_CONFIG: Config = {
  tags: [
    {
      slug: "concepts",
      name: "Concepts",
      color: "primary",
      emoji: "💡",
      description:
        "Core ideas — Option, Result, match, composition.",
    },
    {
      slug: "packages",
      name: "Packages",
      color: "info",
      emoji: "📦",
      description:
        "One page per workspace package.",
    },
    {
      slug: "contributing",
      name: "Contributing",
      color: "success",
      emoji: "🤝",
      description: "Conventions for contributors.",
    },
    {
      slug: "guide",
      name: "Guide",
      color: "secondary",
      emoji: "📖",
      description:
        "Top-level getting-started pages.",
    },
  ],
  exclusions: [],
  layout: "single-column",
  sizingTheme: "sz-comfortable",
};
