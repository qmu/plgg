import { type SoftStr } from "plgg";
import {
  type Html,
  el,
  text,
  attr,
} from "plgg-view";
import {
  clusterClass,
  exampleClass,
  exampleItemClass,
  previewBarClass,
  previewClass,
  splitClass,
  splitPaneClass,
  swatchChipClass,
  swatchClass,
  swatchesClass,
} from "plggmatic/Meta/model/classHooks";
import { splitter } from "plggmatic/Component/usecase/workbench";

/**
 * AN EXAMPLE BOX: the box a thing is shown in, apart
 * from the page around it — a live component in a guide,
 * a result under the form that made it.
 */
export const exampleBox = <Msg>(
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", exampleClass)],
    children.map((child: Html<Msg>) =>
      el(
        "div",
        [attr("class", exampleItemClass)],
        [child],
      ),
    ),
  );

/**
 * A CLUSTER: things side by side with one gap between
 * them, wrapping to the next line when they do not fit —
 * a few buttons, a run of badges.
 */
export const cluster = <Msg>(
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", clusterClass)],
    children,
  );

/**
 * A SPLIT: two panes and the boundary between them. The
 * boundary is the kit's splitter; `vertical` sets the
 * panes left and right, `horizontal` one over the other.
 */
export type SplitProps<Msg> = Readonly<{
  label: SoftStr;
  orientation: "vertical" | "horizontal";
  first: ReadonlyArray<Html<Msg>>;
  second: ReadonlyArray<Html<Msg>>;
}>;
export const split = <Msg>(
  props: SplitProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [
      attr("class", splitClass),
      attr("data-orientation", props.orientation),
    ],
    [
      el(
        "div",
        [attr("class", splitPaneClass)],
        props.first,
      ),
      splitter<Msg>({
        label: props.label,
        orientation: props.orientation,
      }),
      el(
        "div",
        [attr("class", splitPaneClass)],
        props.second,
      ),
    ],
  );

/**
 * A SWATCH: one colour, shown with its name and how it
 * is written. The colour is any CSS colour — a token's
 * reference follows the scheme the page is in.
 */
export type SwatchProps = Readonly<{
  name: SoftStr;
  written: SoftStr;
  color: SoftStr;
}>;
export const swatch = <Msg>(
  props: SwatchProps,
): Html<Msg> =>
  el(
    "div",
    [attr("class", swatchClass)],
    [
      el(
        "span",
        [
          attr("class", swatchChipClass),
          attr(
            "style",
            `background:${props.color}`,
          ),
        ],
        [],
      ),
      el("strong", [], [text(props.name)]),
      el("code", [], [text(props.written)]),
    ],
  );
/** Swatches laid out as many to a line as fit. */
export const swatches = <Msg>(
  items: ReadonlyArray<SwatchProps>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", swatchesClass)],
    items.map((item: SwatchProps) =>
      swatch<Msg>(item),
    ),
  );

/**
 * A PREVIEW: another page shown inside this one, in a
 * frame that names it and offers it in a tab of its own.
 * The page is fetched only when the frame comes near.
 */
export type PreviewProps = Readonly<{
  title: SoftStr;
  src: SoftStr;
  openLabel: SoftStr;
}>;
export const preview = <Msg>(
  props: PreviewProps,
): Html<Msg> =>
  el(
    "div",
    [attr("class", previewClass)],
    [
      el(
        "div",
        [attr("class", previewBarClass)],
        [
          el("span", [], [text(props.title)]),
          el(
            "a",
            [
              attr("href", props.src),
              attr("target", "_blank"),
              attr("rel", "noopener"),
            ],
            [text(props.openLabel)],
          ),
        ],
      ),
      el(
        "iframe",
        [
          attr("src", props.src),
          attr("title", props.title),
          attr("loading", "lazy"),
        ],
        [],
      ),
    ],
  );
