import { type SoftStr } from "plgg";
import { type Html, span, text } from "plgg-view";
import {
  style_,
  bg,
  textColor,
  borderColor,
  border,
  decl,
} from "plggmatic/styleEntry";
import { type Styles } from "plgg-view/style";
import { type Tone } from "plggmatic/Component/usecase/toast";

/**
 * A badge's tone — a closed set so the tone → token map
 * below is exhaustive. `neutral` and `emphasis` are the
 * everyday pair; the rest reuse the semantic {@link Tone}
 * roles.
 */
export type BadgeTone =
  "neutral" | "emphasis" | Tone;

export const badgeTones: ReadonlyArray<BadgeTone> =
  [
    "neutral",
    "emphasis",
    "success",
    "danger",
    "warning",
    "info",
  ];

/**
 * A badge's props: a short one-word `label` (e.g. "AI")
 * and its `tone`.
 */
export type BadgeProps = Readonly<{
  label: SoftStr;
  tone: BadgeTone;
}>;

const toneStyles = (tone: BadgeTone): Styles => {
  switch (tone) {
    case "neutral":
      return [
        ...bg("surface-2"),
        ...textColor("muted"),
        ...borderColor("border"),
      ];
    case "emphasis":
      return [
        ...bg("primary-surface"),
        ...textColor("primary-text"),
        ...borderColor("primary-border"),
      ];
    case "success":
      return [
        ...bg("success-surface"),
        ...textColor("success-text"),
        ...borderColor("success-border"),
      ];
    case "danger":
      return [
        ...bg("danger-surface"),
        ...textColor("danger-text"),
        ...borderColor("danger-border"),
      ];
    case "warning":
      return [
        ...bg("warning-surface"),
        ...textColor("warning-text"),
        ...borderColor("warning-border"),
      ];
    case "info":
      return [
        ...bg("info-surface"),
        ...textColor("info-text"),
        ...borderColor("info-border"),
      ];
  }
};

/**
 * A small inline label pill. **Recorded rule**: the tone
 * is conveyed by the text itself plus a hairline border,
 * never by color alone — the label always reads on its
 * own. Pure, with no interaction (a badge is not a
 * control).
 */
export const badge = (
  props: BadgeProps,
): Html<never, "span"> =>
  span(
    [
      style_(
        border,
        toneStyles(props.tone),
        decl("display", "inline-block"),
        decl("padding", "0 0.5em"),
        decl("border-radius", "999px"),
        decl("font-size", "0.75em"),
        decl("line-height", "1.5"),
        decl("white-space", "nowrap"),
      ),
    ],
    [text(props.label)],
  );
