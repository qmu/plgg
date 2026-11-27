import {
  type SoftStr,
  type Option,
  matchOption,
} from "plgg";
import {
  type Html,
  el,
  text,
  attr,
} from "plgg-view";
import { type Tone } from "plggmatic/Component/usecase/toast";
import {
  alertClass,
  alertTitleClass,
  alertToneClass,
  busyAttr,
  progressBarClass,
  progressClass,
  progressTrackClass,
  skeletonClass,
  skeletonLineClass,
  spinnerClass,
  spinnerMarkClass,
  tipAttr,
  tipClass,
} from "plggmatic/Meta/model/classHooks";

/**
 * AN ALERT: a notice set in the page, staying where it
 * was put (a toast comes and goes; this does not). A
 * `danger` one is announced at once, the rest politely.
 */
export type AlertProps<Msg> = Readonly<{
  tone: Tone;
  title: Option<SoftStr>;
  body: ReadonlyArray<Html<Msg>>;
}>;
export const alert = <Msg>(
  props: AlertProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [
      attr(
        "class",
        `${alertClass} ${alertToneClass(props.tone)}`,
      ),
      attr(
        "role",
        props.tone === "danger"
          ? "alert"
          : "status",
      ),
    ],
    [
      ...matchOption<
        SoftStr,
        ReadonlyArray<Html<Msg>>
      >(
        () => [],
        (title: SoftStr) => [
          el(
            "p",
            [attr("class", alertTitleClass)],
            [text(title)],
          ),
        ],
      )(props.title),
      ...props.body,
    ],
  );

/** A share between nothing and all, as a whole percent. */
const percent = (share: number): number =>
  Math.round(
    Math.min(1, Math.max(0, share)) * 100,
  );

/**
 * A PROGRESS: how far a task has come. With a share (0
 * to 1) the bar is that long; with none, the end is not
 * known and the bar only says that work goes on.
 */
export type ProgressProps = Readonly<{
  label: SoftStr;
  share: Option<number>;
}>;
export const progress = <Msg>(
  props: ProgressProps,
): Html<Msg> =>
  el(
    "div",
    [
      attr("class", progressClass),
      attr("role", "progressbar"),
      attr("aria-label", props.label),
      ...matchOption<
        number,
        ReadonlyArray<ReturnType<typeof attr>>
      >(
        () => [attr(busyAttr, "")],
        (share: number) => [
          attr("aria-valuemin", "0"),
          attr("aria-valuemax", "100"),
          attr(
            "aria-valuenow",
            String(percent(share)),
          ),
        ],
      )(props.share),
    ],
    [
      el(
        "div",
        [attr("class", progressTrackClass)],
        [
          el(
            "div",
            [
              attr("class", progressBarClass),
              ...matchOption<
                number,
                ReadonlyArray<
                  ReturnType<typeof attr>
                >
              >(
                () => [],
                (share: number) => [
                  attr(
                    "style",
                    `width:${percent(share)}%`,
                  ),
                ],
              )(props.share),
            ],
            [],
          ),
        ],
      ),
    ],
  );

/**
 * A SPINNER: the mark of waiting, with the words that
 * say what is waited for.
 */
export const spinner = <Msg>(
  label: SoftStr,
): Html<Msg> =>
  el(
    "span",
    [
      attr("class", spinnerClass),
      attr("role", "status"),
    ],
    [
      el(
        "span",
        [
          attr("class", spinnerMarkClass),
          attr("aria-hidden", "true"),
        ],
        [],
      ),
      text(label),
    ],
  );

/**
 * A SKELETON: the shape of content that has not come
 * yet — so many lines of it. Hidden from a screen
 * reader, which is told by a spinner or a live region.
 */
export const skeleton = <Msg>(
  lines: number,
): Html<Msg> =>
  el(
    "div",
    [
      attr("class", skeletonClass),
      attr("aria-hidden", "true"),
    ],
    Array.from(
      { length: Math.max(1, Math.round(lines)) },
      () =>
        el<Msg>(
          "div",
          [attr("class", skeletonLineClass)],
          [],
        ),
    ),
  );

/**
 * A TOOLTIP: a short word shown when the thing is
 * hovered or focused. The same word is the thing's
 * accessible description, so it is never the only place
 * a fact is said to someone who cannot hover.
 */
export type TooltipProps<Msg> = Readonly<{
  tip: SoftStr;
  children: ReadonlyArray<Html<Msg>>;
}>;
export const tooltip = <Msg>(
  props: TooltipProps<Msg>,
): Html<Msg> =>
  el(
    "span",
    [
      attr("class", tipClass),
      attr(tipAttr, props.tip),
      attr("aria-description", props.tip),
      attr("tabindex", "0"),
    ],
    props.children,
  );
