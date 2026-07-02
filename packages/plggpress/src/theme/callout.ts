import {
  type Html,
  div,
  p,
  text,
  slot,
  class_,
} from "plggmatic";

/**
 * The closed callout kind set — the five qmu.co.jp
 * admonitions: the two monochrome `info`/`note`, the
 * emerald `tip`, plus `warning`/`danger`. A union (not a
 * free `SoftStr`), so an unknown kind is a compile error
 * and {@link LABEL} stays exhaustive by construction.
 * (plgg-md's own renderer emits `tip`/`warning`/`danger`;
 * `info`/`note` extend the theme surface for authored
 * callouts.)
 */
export type CalloutKind =
  | "info"
  | "note"
  | "tip"
  | "warning"
  | "danger";

/**
 * The human label shown as each kind's box title. A
 * `Record` over {@link CalloutKind} makes the table
 * exhaustive — adding a kind without its entry is a
 * compile error. The accent colour + tinted background
 * are owned by {@link baseCss} (keyed on the
 * `vp-callout-<kind>` class), not encoded here.
 */
const LABEL: Record<CalloutKind, string> = {
  info: "Info",
  note: "Note",
  tip: "Tip",
  warning: "Warning",
  danger: "Danger",
};

/**
 * A styled admonition box — the component plgg-md's
 * `Callout` block renders into. `body` is the
 * already-rendered Markdown children (an opaque
 * `Html<never>` the content model can't constrain), so it
 * rides into the typed `div` through {@link slot} rather
 * than the general-builder hatch. The `vp-callout` +
 * `vp-callout-<kind>` classes select the presentation in
 * {@link baseCss}; the label is resolved from
 * {@link LABEL} by exhaustive lookup, so every kind is
 * styled and none can be missed.
 */
export const callout = (
  kind: CalloutKind,
  body: Html<never>,
): Html<never, "div"> =>
  div(
    [class_("vp-callout vp-callout-" + kind)],
    [
      p(
        [class_("vp-callout-title")],
        [text(LABEL[kind])],
      ),
      slot([], [body]),
    ],
  );
