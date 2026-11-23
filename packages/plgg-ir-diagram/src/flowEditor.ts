import {
  fitFlow,
  flowView,
  viewAt,
  type Flow,
  type Change,
} from "plgg-flow";
import {
  parseSpec,
  applySpec,
} from "plgg-flow/dsl";
import { sourceFlow } from "plgg-ir-diagram/flow";
import {
  attr,
  el,
  text,
  mapHtml,
  onClick,
  onInput,
  type Html,
} from "plgg-view";
import {
  cmdNone,
  sandbox,
} from "plgg-view/client";

type Model = Readonly<{
  source: string;
  flow: Flow;
  error?: string;
}>;
type Edit = (model: Model) => Model;

/** Mount the interactive board for a `plgg-flow` block. */
export const mountFlow = (
  root: Element,
  source: string,
) => {
  const first = sourceFlow(source);
  if (first.__tag === "Err") return;
  const change =
    (fn: Change): Edit =>
    (m) => ({ ...m, flow: fn(m.flow) });
  const button = (label: string, fn: Change) =>
    el(
      "button",
      [
        attr("type", "button"),
        onClick(change(fn)),
      ],
      [text(label)],
    );
  const retype =
    (value: string): Edit =>
    (m) => {
      const r = parseSpec(value);
      return r.__tag === "Err"
        ? {
            ...m,
            source: value,
            error: r.content,
          }
        : {
            source: value,
            flow: applySpec(r.content)(m.flow),
          };
    };
  const view = (m: Model): Html<Edit> =>
    el(
      "figure",
      [attr("class", "plgg-flow")],
      [
        mapHtml(change)(flowView(m.flow)),
        el(
          "div",
          [attr("class", "controls")],
          [
            button("平面", viewAt(0, 0)),
            button("立体", viewAt(-0.48, 0.42)),
            button("全体", fitFlow),
          ],
        ),
        ...(m.error
          ? [
              el(
                "div",
                [
                  attr("class", "error"),
                  attr("aria-live", "polite"),
                ],
                [text(m.error)],
              ),
            ]
          : []),
        el(
          "details",
          [],
          [
            el("summary", [], [text("ソース")]),
            el(
              "textarea",
              [
                attr("aria-label", "図のソース"),
                attr("spellcheck", "false"),
                attr("value", m.source),
                onInput(retype),
              ],
              [],
            ),
          ],
        ),
      ],
    );
  root.replaceChildren();
  return sandbox<Model, Edit>({
    init: [
      { source, flow: first.content },
      cmdNone(),
    ],
    view,
    update: (edit, m) => [edit(m), cmdNone()],
  })(root);
};
