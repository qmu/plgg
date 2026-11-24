import {
  el,
  attr,
  text,
  renderToString,
} from "plgg-view";
import { flowView } from "plgg-flow/sheetView";
import {
  frameOf,
  type Flow,
} from "plgg-flow/model";
/** Standalone SVG uses the built-in data-only drawing vocabulary. */
export const svgImage = (flow: Flow): string =>
  renderToString(flowView(flow)).replace(
    "<svg ",
    `<svg xmlns="http://www.w3.org/2000/svg" width="${frameOf(flow).x}" height="${frameOf(flow).y}" font-family="sans-serif" font-size="13" `,
  );

/** Offline, script-free reader. Fragment identifiers are generated locally;
 * labels and wire text are escaped by the plgg HTML renderer. */
export const drawingReader = (
  flow: Flow,
): string => {
  const index = new Map(
    flow.nodes.map((n, i) => [
      n.id,
      { name: n.label, id: "card-" + i },
    ]),
  );
  const link = (id: string) => {
    const n = index.get(id);
    return n
      ? el(
          "a",
          [attr("href", "#" + n.id)],
          [text(n.name)],
        )
      : text(id);
  };
  const wires = new Map<
    string,
    ReturnType<typeof link>[]
  >();
  const add = (
    id: string,
    direction: string,
    other: string,
    label?: string,
  ) => {
    const item = el(
      "li",
      [],
      [
        text(direction + "　"),
        link(other),
        ...(label ? [text("　" + label)] : []),
      ],
    );
    const list = wires.get(id);
    if (list) list.push(item);
    else wires.set(id, [item]);
  };
  for (const e of flow.edges) {
    add(e.source, "出力", e.target, e.label);
    add(e.target, "入力", e.source, e.label);
  }
  const contents = el(
    "main",
    [],
    [
      el("h1", [], [text("図面")]),
      el(
        "nav",
        [attr("aria-label", "カード一覧")],
        [
          el(
            "ul",
            [],
            flow.nodes.map((n) =>
              el("li", [], [link(n.id)]),
            ),
          ),
        ],
      ),
      ...flow.nodes.map((n) =>
        el(
          "section",
          [attr("id", index.get(n.id)!.id)],
          [
            el("h2", [], [text(n.label)]),
            el("p", [], [text(n.id)]),
            ...(n.parent !== undefined
              ? [
                  el(
                    "p",
                    [],
                    [
                      text("親グループ　"),
                      link(n.parent),
                    ],
                  ),
                ]
              : []),
            ...(wires.has(n.id)
              ? [el("ul", [], wires.get(n.id)!)]
              : []),
          ],
        ),
      ),
    ],
  );
  return (
    '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; base-uri &apos;none&apos;; form-action &apos;none&apos;"><title>図面</title></head><body>' +
    renderToString(contents) +
    "</body></html>"
  );
};
