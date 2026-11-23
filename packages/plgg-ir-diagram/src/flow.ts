import { ok, type Result } from "plgg";
import {
  fitFlow,
  flowView,
  viewAt,
  type Flow,
} from "plgg-flow";
import {
  parseSpec,
  specFlow,
} from "plgg-flow/dsl";
import {
  el,
  attr,
  text,
  raw,
  renderToString,
  type Html,
} from "plgg-view";

/** The flow a fenced `plgg-flow` block draws, fitted to its frame. */
export const sourceFlow = (
  source: string,
): Result<Flow, string> => {
  const r = parseSpec(source);
  return r.__tag === "Ok"
    ? ok(fitFlow(specFlow(r.content)))
    : r;
};

/** Only the escaped plgg-view SSR result enters raw(). */
const board = (flow: Flow) =>
  raw(renderToString(flowView(flow)));

/**
 * The static form of a `plgg-flow` block: a drawn board that
 * reads without script, the source under it. The browser
 * runtime replaces it with the interactive board.
 */
export const flowWidget = (
  source: string,
): Html<never> => {
  const r = sourceFlow(source);
  const listing = el<never>(
    "details",
    [],
    [
      el("summary", [], [text("ソース")]),
      el(
        "pre",
        [],
        [el("code", [], [text(source)])],
      ),
    ],
  );
  return r.__tag === "Err"
    ? el(
        "figure",
        [attr("class", "plgg-flow-error")],
        [el("p", [], [text(r.content)]), listing],
      )
    : el(
        "figure",
        [attr("class", "plgg-flow")],
        [board(r.content), listing],
      );
};

/** The 3D angle the "立体" control turns to. */
export const tilted = (flow: Flow) =>
  fitFlow(viewAt(-0.48, 0.42)(flow));

export const flowCss = `
:root{--ink:#000;--paper:#fff;--graphite:#5c5c5c;--trace:#e4e4e4}
*{box-sizing:border-box}html,body{margin:0;background:var(--paper);color:var(--ink);font:14px/1.6 system-ui,sans-serif}
figure{margin:0;position:relative}
.flow-board{display:block;width:100%;height:auto;aspect-ratio:900/580;background:var(--paper)!important;border:1px solid var(--ink);user-select:none;touch-action:none}
.flow-board text{font:500 13px system-ui,sans-serif;fill:var(--ink)!important}
.flow-board [stroke]:not([stroke="none"]){stroke:var(--ink)}
.flow-board [fill]:not([fill="none"]){fill:var(--paper)}
.flow-board circle[fill]:not([fill="none"]):not([fill="#fff"]):not([fill="white"]){fill:var(--ink)}
.flow-board polygon[data-arrow][fill]{fill:var(--ink)}
.flow-board [stroke-dasharray]{stroke:var(--graphite)}
.flow-board .scroll-hint rect{fill:var(--ink)!important}
.flow-board .scroll-hint text{fill:var(--paper)!important;font-size:16px}
.flow-board .world-grid{stroke:var(--trace)!important;stroke-width:.8}
.flow-board .edge-label{paint-order:stroke;stroke:var(--paper)!important;stroke-width:5px}
.flow-board g{cursor:grab}
.controls{position:absolute;top:8px;left:8px;display:flex}
.controls button{font:inherit;font-size:12px;cursor:pointer;background:var(--paper);color:var(--ink);border:1px solid var(--ink);padding:3px 10px}
.controls button+button{margin-left:-1px}
.controls button:hover{background:#f4f4f4}
summary{cursor:pointer;padding:6px 0;font-size:12px;color:var(--graphite)}
pre,textarea{width:100%;margin:0;font:12.5px/1.65 ui-monospace,Menlo,monospace;padding:10px;border:1px solid var(--ink);background:var(--paper);color:var(--ink)}
textarea{min-height:10rem;resize:vertical}
.error{padding:4px 10px;background:var(--ink);color:var(--paper);font-size:12px}
.plgg-flow-error p{margin:0 0 6px;padding:6px 10px;background:var(--ink);color:var(--paper)}
:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
`;
