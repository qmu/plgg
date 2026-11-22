import { compileDiagram } from "plgg-ir-diagram/index";
import { diagramFlow } from "plgg-ir-diagram/widget";
import {
  createFlow,
  fitFlow,
  flowView,
  viewAt,
  type Flow,
  type Change,
} from "plgg-flow";
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

type Model = {
  source: string;
  result: ReturnType<typeof compileDiagram>;
  flow: Flow;
};
type Edit = (model: Model) => Model;
const read = (
  source: string,
  previous?: Flow,
): Model => {
  const result = compileDiagram(source);
  return {
    source,
    result,
    flow:
      result.__tag === "Ok"
        ? diagramFlow(result.content, previous)
        : (previous ??
          createFlow({ nodes: [], edges: [] })),
  };
};
export const mountDiagram = (
  root: Element,
  source: string,
  editor: boolean,
) => {
  const change =
    (fn: Change): Edit =>
    (m) => {
      const flow = fn(m.flow);
      // Text owns topology. Viewport gestures may move nodes and the camera.
      if (
        flow.nodes.length !==
          m.flow.nodes.length ||
        flow.edges.length !== m.flow.edges.length
      )
        return m;
      return { ...m, flow };
    };
  const button = (label: string, edit: Edit) =>
    el(
      "button",
      [attr("type", "button"), onClick(edit)],
      [text(label)],
    );
  const view = (m: Model): Html<Edit> =>
    el(
      "section",
      [],
      [
        el(
          "div",
          [attr("class", "controls")],
          [
            button("平面", change(viewAt(0, 0))),
            button(
              "立体",
              change(viewAt(-0.48, 0.42)),
            ),
            button("全体を表示", change(fitFlow)),
          ],
        ),
        mapHtml(change)(flowView(m.flow)),
        el(
          "details",
          editor ? [attr("open", "")] : [],
          [
            el(
              "summary",
              [],
              [text("図のソース")],
            ),
            el(
              "textarea",
              [
                attr("aria-label", "図のソース"),
                attr("spellcheck", "false"),
                attr("value", m.source),
                onInput(
                  (source): Edit =>
                    (old) =>
                      read(source, old.flow),
                ),
              ],
              [],
            ),
          ],
        ),
        el(
          "div",
          [attr("aria-live", "polite")],
          m.result.__tag === "Err"
            ? m.result.content.map((d) =>
                button(
                  d.range.start.line +
                    "行 " +
                    d.range.start.column +
                    "列　" +
                    d.message,
                  (old) => {
                    const area =
                      root.querySelector(
                        "textarea",
                      );
                    if (area) {
                      area.parentElement?.setAttribute(
                        "open",
                        "",
                      );
                      area.focus();
                      area.setSelectionRange(
                        d.range.start.offset,
                        d.range.end.offset,
                      );
                    }
                    return old;
                  },
                ),
              )
            : [],
        ),
        ...(editor && m.result.__tag === "Ok"
          ? [
              el(
                "details",
                [],
                [
                  el(
                    "summary",
                    [],
                    [text("正規 IR")],
                  ),
                  el(
                    "pre",
                    [],
                    [text(m.result.content.ir)],
                  ),
                ],
              ),
            ]
          : []),
      ],
    );
  root.replaceChildren();
  return sandbox<Model, Edit>({
    init: [read(source), cmdNone()],
    view,
    update: (edit, m) => [edit(m), cmdNone()],
  })(root);
};
