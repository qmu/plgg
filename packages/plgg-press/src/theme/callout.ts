import {
  type Html,
  div,
  p,
  text,
  slot,
} from "plgg-view";
import {
  type Color,
  style_,
  border,
  borderColor,
  rounded,
  p as pad,
  mb,
  weight,
  color,
  bg,
} from "plgg-view/style";

/**
 * The closed callout kind set — exactly the admonitions
 * plgg-md emits (`tip`/`warning`/`danger`). A union (not a
 * free `SoftStr`), so an unknown kind is a compile error
 * and {@link PALETTE} stays exhaustive by construction.
 */
export type CalloutKind =
  | "tip"
  | "warning"
  | "danger";

/**
 * One kind's presentation: its accent {@link Color} (used
 * for the border + heading) and the human label shown as
 * the box title. A `Record` over {@link CalloutKind}
 * makes the table exhaustive — adding a kind without its
 * entry is a compile error, the type-driven win over a
 * defaulting lookup.
 */
const PALETTE: Record<
  CalloutKind,
  Readonly<{ accent: Color; label: string }>
> = {
  tip: { accent: "primary", label: "Tip" },
  warning: { accent: "muted", label: "Warning" },
  danger: { accent: "danger", label: "Danger" },
};

/**
 * A styled admonition box — the component plgg-md's
 * {@link Callout} block renders into. `body` is the
 * already-rendered Markdown children (an opaque
 * `Html<never>` the content model can't constrain), so it
 * rides into the typed `div` through {@link slot} rather
 * than the general-builder hatch. The accent colour and label are
 * resolved from {@link PALETTE} by exhaustive lookup, so
 * every kind is styled and none can be missed.
 */
export const callout = (
  kind: CalloutKind,
  body: Html<never>,
): Html<never, "div"> => {
  const tone = PALETTE[kind];
  return div(
    [
      style_(
        border,
        borderColor(tone.accent),
        rounded("md"),
        pad(4),
        bg("surface-2"),
      ),
    ],
    [
      p(
        [
          style_(
            weight(600),
            color(tone.accent),
            mb(2),
          ),
        ],
        [text(tone.label)],
      ),
      slot([], [body]),
    ],
  );
};
