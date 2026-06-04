import { SoftStr } from "plgg";
import {
  Styles,
  decl,
} from "plgg-view/Style/model/Style";
import {
  Color,
  Radius,
  FontSize,
  Shadow,
  Align,
  Justify,
  spacing,
  colorValue,
  radiusValue,
  fontSizeValue,
  shadowValue,
  alignValue,
  justifyValue,
} from "plgg-view/Style/model/token";

// A length utility over one CSS property, on the spacing scale. Sharing one
// factory keeps the `p`/`m`/`w`/… family a single source location.
const lenProp =
  (prop: SoftStr) =>
  (n: number): Styles =>
    decl(prop, spacing(n));

// A length utility over a pair of properties (the `px`/`py`/`mx`/`my` axes).
const lenPair =
  (a: SoftStr, b: SoftStr) =>
  (n: number): Styles => [
    ...decl(a, spacing(n)),
    ...decl(b, spacing(n)),
  ];

// --- layout --------------------------------------------------------------

export const flex: Styles = decl(
  "display",
  "flex",
);
export const flexCol: Styles = [
  ...decl("display", "flex"),
  ...decl("flex-direction", "column"),
];
export const inlineFlex: Styles = decl(
  "display",
  "inline-flex",
);
export const block: Styles = decl(
  "display",
  "block",
);
export const grid: Styles = decl(
  "display",
  "grid",
);
export const wrap: Styles = decl(
  "flex-wrap",
  "wrap",
);
export const items = (a: Align): Styles =>
  decl("align-items", alignValue(a));
export const justify = (j: Justify): Styles =>
  decl("justify-content", justifyValue(j));
export const gap = lenProp("gap");
export const grow: Styles = decl(
  "flex-grow",
  "1",
);
export const listNone: Styles = decl(
  "list-style",
  "none",
);

// --- spacing -------------------------------------------------------------

export const p = lenProp("padding");
export const pt = lenProp("padding-top");
export const pr = lenProp("padding-right");
export const pb = lenProp("padding-bottom");
export const pl = lenProp("padding-left");
export const px = lenPair(
  "padding-left",
  "padding-right",
);
export const py = lenPair(
  "padding-top",
  "padding-bottom",
);
export const m = lenProp("margin");
export const mt = lenProp("margin-top");
export const mr = lenProp("margin-right");
export const mb = lenProp("margin-bottom");
export const ml = lenProp("margin-left");
export const mx = lenPair(
  "margin-left",
  "margin-right",
);
export const my = lenPair(
  "margin-top",
  "margin-bottom",
);

// --- sizing --------------------------------------------------------------

export const w = lenProp("width");
export const h = lenProp("height");
export const maxW = lenProp("max-width");
export const minW = lenProp("min-width");
export const wFull: Styles = decl(
  "width",
  "100%",
);
export const hFull: Styles = decl(
  "height",
  "100%",
);

// --- typography ----------------------------------------------------------

export const text = (s: FontSize): Styles =>
  decl("font-size", fontSizeValue(s));
export const weight = (n: number): Styles =>
  decl("font-weight", `${n}`);
export const color = (c: Color): Styles =>
  decl("color", colorValue(c));
export const center: Styles = decl(
  "text-align",
  "center",
);
export const left: Styles = decl(
  "text-align",
  "left",
);
export const right: Styles = decl(
  "text-align",
  "right",
);

// --- background / border -------------------------------------------------

export const bg = (c: Color): Styles =>
  decl("background-color", colorValue(c));
export const rounded = (r: Radius): Styles =>
  decl("border-radius", radiusValue(r));
export const border: Styles = decl(
  "border",
  `1px solid ${colorValue("border")}`,
);
export const borderColor = (c: Color): Styles =>
  decl("border-color", colorValue(c));

// --- effects -------------------------------------------------------------

export const shadow = (s: Shadow): Styles =>
  decl("box-shadow", shadowValue(s));
/** Opacity in the `0..1` range. */
export const opacity = (n: number): Styles =>
  decl("opacity", `${n}`);
export const pointer: Styles = decl(
  "cursor",
  "pointer",
);
