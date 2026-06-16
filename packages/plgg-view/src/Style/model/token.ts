import { SoftStr } from "plgg";

/**
 * Spacing scale → rem. Tailwind's step model (`step × 0.25rem`), so
 * `spacing(3)` is `0.75rem`. One numeric scale keeps every `p`/`m`/`gap`/`w`
 * utility consistent.
 */
export const spacing = (step: number): SoftStr =>
  `${step * 0.25}rem`;

/**
 * The closed color-token set. Because it is a union (not a free string), an
 * unknown token like `bg("blurple")` is a compile error — the type-driven win
 * over stringly CSS classes. Values chosen for adequate text/surface contrast
 * (WCAG 2.2 AA).
 */
export type Color =
  | "surface"
  | "surface-2"
  | "primary"
  | "primary-text"
  | "text"
  | "muted"
  | "border"
  | "danger";

// Warm editorial palette: ink on cream paper with a confident pine accent and a
// distinct brick for danger. A characterful default, not generic blue-on-white.
const COLOR: Record<Color, SoftStr> = {
  surface: "#fffdf7",
  "surface-2": "#f0e9d8",
  primary: "#1f6b54",
  "primary-text": "#fbfaf3",
  text: "#2a241d",
  muted: "#8a8073",
  border: "#e6dcc8",
  danger: "#b23a2a",
};

/** A {@link Color} token's concrete value (`Record` makes the map exhaustive). */
export const colorValue = (c: Color): SoftStr =>
  COLOR[c];

export type Radius = "sm" | "md" | "lg" | "full";

const RADIUS: Record<Radius, SoftStr> = {
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  full: "9999px",
};

export const radiusValue = (r: Radius): SoftStr =>
  RADIUS[r];

export type FontSize =
  | "sm"
  | "base"
  | "lg"
  | "xl"
  | "2xl";

const FONT_SIZE: Record<FontSize, SoftStr> = {
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
};

export const fontSizeValue = (
  s: FontSize,
): SoftStr => FONT_SIZE[s];

export type Shadow = "sm" | "md" | "lg";

const SHADOW: Record<Shadow, SoftStr> = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px rgba(0, 0, 0, 0.1)",
};

export const shadowValue = (s: Shadow): SoftStr =>
  SHADOW[s];

export type Align =
  | "start"
  | "center"
  | "end"
  | "stretch";

const ALIGN: Record<Align, SoftStr> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

export const alignValue = (a: Align): SoftStr =>
  ALIGN[a];

export type Justify =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around";

const JUSTIFY: Record<Justify, SoftStr> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
};

export const justifyValue = (
  j: Justify,
): SoftStr => JUSTIFY[j];
