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
[data-island="plgg-flow"]{--ink:var(--pm-text);--paper:var(--pm-surface);--graphite:var(--pm-muted);--trace:var(--pm-border);
color:var(--ink);background:var(--paper);
figure{margin:0;position:relative}
.flow-board{display:block;width:100%;height:auto;aspect-ratio:900/580;background:var(--paper)!important;border:1px solid var(--ink);user-select:none;touch-action:none}
.flow-board text{font-family:inherit;font-size:13px;font-weight:500;fill:var(--ink)!important}
.flow-board [stroke]:not([stroke="none"]){stroke:var(--ink)}
.flow-board [fill]:not([fill="none"]){fill:var(--paper)}
.flow-board circle[fill]:not([fill="none"]):not([fill="#fff"]):not([fill="white"]){fill:var(--ink)}
.flow-board polygon[data-arrow][fill]{fill:var(--ink)}
.flow-board [stroke-dasharray]{stroke:var(--graphite)}
.flow-board .scroll-hint rect{fill:var(--ink)!important}
.flow-board .scroll-hint text{fill:var(--paper)!important;font-size:16px}
.flow-board [data-node]:focus,.flow-board [data-port]:focus{outline:none}
.flow-board [data-node]:focus-visible polygon{stroke-dasharray:3 2}
.flow-board [data-node][aria-pressed="true"] polygon{stroke-width:2.4}
:focus:not(:focus-visible){outline:none}
.flow-board:focus,.flow-board :focus{outline:none}
.flow-board path.edge[stroke="#e36731"]{stroke-width:3px}
.flow-board .world-grid{stroke:var(--trace)!important;stroke-width:.8}
.flow-board .edge-label{paint-order:stroke;stroke:var(--paper)!important;stroke-width:5px}
.flow-board,.flow-board g{cursor:default}
.flow-board:active,.flow-board:active g{cursor:grabbing}
.flow-board path.edge,.flow-board .edge-hit{cursor:pointer}
.flow-board circle{cursor:crosshair}
.flow-board .edge-hit{stroke-opacity:0!important}
.flow-board .marquee{fill:color-mix(in srgb,var(--ink) 6%,transparent);stroke:var(--ink);stroke-width:1;stroke-dasharray:5 4;vector-effect:non-scaling-stroke;animation:marquee 1.8s linear infinite}
@keyframes marquee{to{stroke-dashoffset:-18}}
@media (prefers-reduced-motion:reduce){.flow-board .marquee{animation:none}}
.controls{position:absolute;top:8px;left:8px;display:flex}
.controls button{font:inherit;font-size:12px;cursor:pointer;background:var(--paper);color:var(--ink);border:1px solid var(--ink);padding:3px 10px}
.controls button+button{margin-left:-1px}
.controls button:hover{background:var(--trace)}
summary{cursor:pointer;padding:6px 0;font-size:12px;color:var(--graphite)}
pre,textarea{width:100%;margin:0;font:12.5px/1.65 ui-monospace,Menlo,monospace;padding:10px;border:1px solid var(--ink);background:var(--paper);color:var(--ink)}
textarea{min-height:10rem;resize:vertical}
.error{padding:4px 10px;background:var(--ink);color:var(--paper);font-size:12px}
.plgg-flow-error p{margin:0 0 6px;padding:6px 10px;background:var(--ink);color:var(--paper)}
:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
}
`;
