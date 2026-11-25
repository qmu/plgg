import { type SoftStr } from "plgg";
import { type Color } from "plggmatic/Style/model/token";

/**
 * How one state is shown: the fill behind it and the ink
 * on it, both by role — so the mark reschemes with the
 * palette like everything else.
 */
export type Mark = Readonly<{
  fill: Color;
  ink: Color;
}>;

/**
 * AN APPEARANCE: everything about how the framework's UI
 * system LOOKS, and nothing about what it is.
 *
 * The UI system (`System`) fixes structure and behaviour:
 * there is a sidebar and a strip of pages; every column is
 * a head over a body that scrolls on its own; pages share
 * the width, arrive by growing and leave by shrinking; the
 * current thing and the link that opened a page are
 * MARKED. None of that says a rule is black, a corner is
 * square, or a mark is an inversion. Those are answers an
 * appearance gives, and a product is expected to give its
 * own: two products on this system looking nothing alike
 * is the ordinary case, not an exception.
 *
 * An appearance is DATA — a value, not a stylesheet — so
 * it can be compared, derived (`{ ...monochrome, radius:
 * "6px" }`) and checked by the compiler, and so a new one
 * cannot forget a decision: every field is required.
 * {@link appearanceCss} turns one into rules.
 *
 * - type: `font`, `mono`, `size`, `leading`.
 * - line: `rule` frames the columns and bars, `hairline`
 *   separates quieter things inside them, `ruleWidth`.
 * - shape: `radius` of controls and boxes.
 * - emphasis: `current` marks where the reader is (and
 *   what opened the page beside it), `hover` a row under
 *   the pointer, `press` a control or link being acted on.
 * - density: `head` bar height, `gutter` beside rows and
 *   bars, `page` padding round a page's content.
 * - depth: `elevation` of what floats (dialog, toast).
 * - motion: `quick` for state changes, `arrive` / `leave`
 *   / `swap` for pages, `ease`.
 */
export type Appearance = Readonly<{
  name: SoftStr;
  font: SoftStr;
  mono: SoftStr;
  size: SoftStr;
  leading: SoftStr;
  rule: Color;
  hairline: Color;
  ruleWidth: SoftStr;
  radius: SoftStr;
  current: Mark;
  hover: Mark;
  press: Mark;
  head: SoftStr;
  gutter: SoftStr;
  page: SoftStr;
  elevation: SoftStr;
  quick: SoftStr;
  arrive: SoftStr;
  leave: SoftStr;
  swap: SoftStr;
  ease: SoftStr;
}>;

/**
 * THE DEFAULT: monochrome. One ink — the frame is drawn,
 * not shaded in grey, in a rule the palette holds one step
 * under the text colour (full black on white, or white on
 * dark, is harsher than a frame needs to be). Square. The only
 * emphasis is inversion: the current thing swaps text and
 * surface, and so does whatever is being pressed. Calm
 * type on a 15px body.
 *
 * A default, not the system: nothing in `System` assumes
 * any of this.
 */
export const monochrome: Appearance = {
  name: "monochrome",
  font: '"Inter","Noto Sans JP",system-ui,-apple-system,"Segoe UI","Hiragino Sans",sans-serif',
  mono: "ui-monospace,SFMono-Regular,Menlo,monospace",
  size: "15px",
  leading: "1.75",
  rule: "primary-border",
  hairline: "border",
  ruleWidth: "1px",
  radius: "0",
  current: {
    fill: "primary-base",
    ink: "surface",
  },
  hover: { fill: "surface-2", ink: "text" },
  press: { fill: "primary-base", ink: "surface" },
  head: "3rem",
  gutter: "1.25rem",
  page: "2rem 2.5rem 3rem",
  elevation: "none",
  quick: ".15s",
  arrive: ".34s",
  leave: ".26s",
  swap: ".18s",
  ease: "cubic-bezier(.2,.7,.2,1)",
};

/**
 * A second appearance, shipped to keep the first honest:
 * soft. Quiet grey rules, rounded corners, the current
 * thing tinted rather than inverted, floating things
 * lifted by a shadow, the platform's own type, slower
 * motion. Same system, same markup, no rule in common
 * with {@link monochrome} beyond what the type demands.
 */
export const soft: Appearance = {
  name: "soft",
  font: 'system-ui,-apple-system,"Segoe UI","Hiragino Sans",sans-serif',
  mono: "ui-monospace,SFMono-Regular,Menlo,monospace",
  size: "15px",
  leading: "1.7",
  rule: "border",
  hairline: "border",
  ruleWidth: "1px",
  radius: ".5rem",
  current: {
    fill: "primary-surface",
    ink: "primary-text",
  },
  hover: { fill: "surface-2", ink: "text" },
  press: { fill: "surface-2", ink: "text" },
  head: "3.25rem",
  gutter: "1rem",
  page: "1.75rem 2rem 3rem",
  elevation: "0 8px 28px rgba(0,0,0,.16)",
  quick: ".2s",
  arrive: ".42s",
  leave: ".3s",
  swap: ".24s",
  ease: "cubic-bezier(.22,1,.36,1)",
};
