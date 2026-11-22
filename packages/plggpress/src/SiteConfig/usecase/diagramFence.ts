import { readFileSync } from "node:fs";
import {
  diagramWidget,
  diagramCss,
} from "plgg-ir-diagram/widget";
import {
  el,
  attr,
  renderToString,
  type Html,
} from "plgg-view";

let runtime: string | undefined;
/** A self-contained frame also works in exported HTML and client-inserted columns. */
export const diagramFence = (
  code: string,
): Html<never> => {
  runtime ??= readFileSync(
    new URL(
      import.meta.resolve(
        "plgg-ir-diagram/interactive",
      ),
    ),
    "utf8",
  ).replace(/<\/script/gi, "<\\/script");
  const fallback = renderToString(
    diagramWidget(code),
  );
  const doc =
    '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    diagramCss +
    "</style><body><main data-diagram-root>" +
    fallback +
    '</main><script type="module">' +
    runtime +
    "</script></body></html>";
  return el(
    "iframe",
    [
      attr("title", "ダイアグラム"),
      attr("sandbox", "allow-scripts"),
      attr("loading", "lazy"),
      attr(
        "style",
        "width:100%;height:26rem;border:0",
      ),
      attr("srcdoc", doc),
    ],
    [],
  );
};
