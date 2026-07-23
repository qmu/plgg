/**
 * THE INJECTED CLIENT — the code that runs INSIDE the real
 * rendered page, and the reason PoC 4c is a different PoC
 * from 4b.
 *
 * 4b's shell owned its preview: a plgg-view tree it could
 * re-render, so the animation rode plgg-view's `transition`
 * + keyed reconciliation. Here the document is rendered by
 * the internal plggpress dev server and proxied — it is
 * real site HTML, with the site's own markup and styling,
 * and no view tree exists to key. So the shell cannot
 * animate it from outside; the only way in is a script
 * that ships WITH the page. The proxy splices this bundle
 * into every proxied document (see entrypoints/serve.ts),
 * and it does three things there:
 *
 *   1. answers the shell's postMessages (arm / patch /
 *      drop) — the iframe-boundary version of what used to
 *      be a reducer transition;
 *   2. maps each markdown op onto a span of REAL rendered
 *      text and animates it in place (erase, then write) —
 *      the choreography 4b's live judging chose, rebuilt
 *      on raw DOM because plgg-view's seam does not reach
 *      here;
 *   3. OWNS the reload. The dev server's own live-reload
 *      script is stripped by the proxy and replaced by
 *      this one, so the reload frame is arbitrated
 *      (reloadPolicy.ts) instead of racing the patch.
 *
 * This is the DOM/IO edge: it walks nodes, moves pixels
 * and reloads the page. Every DECISION it acts on — what
 * maps, where, and whether to reload — comes from the pure
 * modules and is unit-tested there. Coverage-exempt, like
 * view.ts and vendors/.
 */
import {
  pipe,
  fromNullable,
  matchOption,
  matchResult,
} from "plgg";
import {
  type TextHit,
  type MapFailure,
  mapEditsToSpans,
} from "./spanMap.ts";
import {
  type PatchState,
  type PatchMsg,
  patchInit,
  stepPatch,
  RELOAD_PATH,
} from "./reloadPolicy.ts";
import { type EditOp } from "./poc4b.ts";
import {
  type PatchMessage,
  type PatchReport,
  asPatchMessage,
  reportEnvelope,
} from "./bridge.ts";

/**
 * The prose column plggpress renders the document into
 * (`main.vp-content > div.vp-doc`). The walk is scoped
 * HERE, not to the body, and that is load-bearing: the
 * theme also renders the sidebar tree and the footer, so a
 * heading like "Getting started" exists two or three times
 * in the document. Body-scoped, almost every heading edit
 * would refuse itself as `AmbiguousInDom`; scoped to the
 * prose column, the exactly-once rule means what it says.
 */
const CONTENT_SELECTOR = ".vp-doc";

/**
 * The erase phase's dwell before the new text writes in —
 * the knob PoC 4b tuned during live judging (its
 * `effects.ts` REVEAL_MS). Restated rather than imported:
 * 4b's copy lives in a module that pulls in plgg-view and
 * WebRTC, and this bundle is injected into EVERY rendered
 * doc page — importing an IO module for one integer would
 * ship the whole shell client into the site.
 */
const REVEAL_MS = 340;

/** How long the "just changed" highlight lingers. */
const SETTLE_MS = 1400;

const STYLE = `
.poc4c-edit {
  border-radius: 3px;
  transition: opacity ${REVEAL_MS}ms ease,
    background-color ${SETTLE_MS}ms ease;
}
.poc4c-erasing {
  opacity: 0.12;
  background-color: rgba(239, 68, 68, 0.22);
}
.poc4c-writing {
  opacity: 1;
  background-color: rgba(34, 197, 94, 0.30);
}
`;

/* ------------------------------------------------ *
 * The reload arbiter                                *
 * ------------------------------------------------ */

// The injected client's ONE mutable slot: the arbitration
// state. An event-driven DOM script has no other place to
// keep it — every transition is decided by the pure
// `stepPatch`, so what lives here is the value, never the
// policy.
let state: PatchState = patchInit;

const step = (msg: PatchMsg): void => {
  const [next, action] = stepPatch(state, msg);
  state = next;
  if (action === "reload") {
    window.location.reload();
  }
};

/* ------------------------------------------------ *
 * The DOM edge                                      *
 * ------------------------------------------------ */

/**
 * Every text run of the prose column, in document order.
 * Imperative by necessity (a TreeWalker is a cursor);
 * isolated to this one function, which returns plain data
 * the pure locator can reason about.
 */
const textNodes = (): ReadonlyArray<Text> => {
  const root = document.querySelector(
    CONTENT_SELECTOR,
  );
  if (root === null) {
    return [];
  }
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );
  const found: Array<Text> = [];
  let node = walker.nextNode();
  while (node !== null) {
    if (node instanceof Text) {
      found.push(node);
    }
    node = walker.nextNode();
  }
  return found;
};

const report = (r: PatchReport): void => {
  window.parent.postMessage(
    reportEnvelope(r),
    window.location.origin,
  );
};

/**
 * Animate ONE located span in place: split its text run so
 * the changed characters stand alone, wrap them, erase
 * them, then write the new text in. Returns the element so
 * the caller can bring it into view.
 */
const animate = (
  node: Text,
  hit: TextHit,
): HTMLElement => {
  // splitText twice: the run becomes [head][needle][tail],
  // and `needle` is the exact span to animate.
  const needle = node.splitText(hit.offset);
  needle.splitText(hit.plain.before.length);
  const span = document.createElement("span");
  span.className = "poc4c-edit poc4c-erasing";
  span.textContent = hit.plain.before;
  needle.replaceWith(span);
  window.setTimeout(() => {
    span.textContent = hit.plain.after;
    span.className = "poc4c-edit poc4c-writing";
    window.setTimeout(() => {
      span.className = "poc4c-edit";
    }, SETTLE_MS);
  }, REVEAL_MS);
  return span;
};

/**
 * Apply a whole `edit_doc` call to the real page. The pure
 * mapper decides everything: whether ALL ops map (one
 * unmappable op refuses the lot, so the page never shows a
 * half-edited document that exists nowhere) and in what
 * order to splice them (last span first, so earlier
 * offsets stay valid as runs are split).
 */
const onPatch = (
  ops: ReadonlyArray<EditOp>,
): void => {
  const nodes = textNodes();
  pipe(
    mapEditsToSpans(
      ops,
      nodes.map((n) => n.data),
    ),
    matchResult(
      (failure: MapFailure): void => {
        // The edit IS on disk; this page just cannot show
        // the change happening. Report why, then stand
        // down so the held reload is released and the
        // writer sees the truth (PoC 4's behaviour).
        report({
          kind: "unmapped",
          failure: failure.kind,
          reason: failure.message,
        });
        step("Dropped");
      },
      (hits: ReadonlyArray<TextHit>): void => {
        pipe(
          hits.flatMap((hit) =>
            pipe(
              fromNullable(nodes[hit.run]),
              matchOption(
                (): ReadonlyArray<HTMLElement> =>
                  [],
                (
                  node: Text,
                ): ReadonlyArray<HTMLElement> => [
                  animate(node, hit),
                ],
              ),
            ),
          ),
          (
            spans: ReadonlyArray<HTMLElement>,
          ): void => {
            // Hits are ordered last-span-first, so the
            // final element is the FIRST change in reading
            // order — the one to bring into view.
            pipe(
              fromNullable(spans[spans.length - 1]),
              matchOption(
                (): void => undefined,
                (first: HTMLElement): void =>
                  first.scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                  }),
              ),
            );
            report({
              kind: "applied",
              spans: spans.length,
            });
            step("Patched");
          },
        );
      },
    ),
  );
};

const onMessage = (
  event: MessageEvent,
): void => {
  if (event.origin !== window.location.origin) {
    return;
  }
  pipe(
    asPatchMessage(event.data),
    matchResult(
      (): void => undefined,
      (message: PatchMessage): void => {
        switch (message.kind) {
          case "arm":
            step("Armed");
            return;
          case "patch":
            onPatch(message.ops);
            return;
          case "drop":
            step("Dropped");
            return;
        }
      },
    ),
  );
};

/**
 * Install the client into the real page. Called by the
 * bundle's entrypoint; the proxy is what puts that bundle
 * here.
 */
export const install = (): void => {
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);
  window.addEventListener("message", onMessage);
  // THE replacement for the dev server's live-reload
  // script (which the proxy strips). Same stream, same
  // frames — but arbitrated, so our own edit's reload is
  // absorbed and everyone else's still lands.
  new EventSource(RELOAD_PATH).onmessage = () =>
    step("ReloadFrame");
};
