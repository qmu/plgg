// THE ARBITRATION between two mechanisms that want the same
// page: the dev server's hot reload, and a live realtime voice
// session.
//
// A reload frame answered with `location.reload()` destroys the
// page's JS context — and with it the `RTCPeerConnection`, the
// microphone track, and the conversation. An assistant that
// drops its own session every time it edits is not the feature.
// So the reload is not SUPPRESSED, it is ARBITRATED (PoC 4c's
// recorded stance, promoted here):
//
// - No session live → `reload`, exactly as before. The
//   hot-reload behaviour proven by the persistent-dev-server
//   ticket is a recorded verdict and must not regress.
// - A session live → `swap`: re-fetch this same URL and put
//   the new content in place, leaving the page's JS context —
//   and therefore the session — untouched. This holds for a
//   frame caused by the assistant's own edit AND for one caused
//   by the writer editing in their own editor: while someone is
//   mid-conversation, continuity of the conversation is the
//   thing worth protecting, and the swap shows the change
//   either way.
// - A frame arriving DURING a swap is held and replayed once
//   the swap finishes, so two writes in quick succession
//   produce one more swap rather than two overlapping ones.
//
// Pure, total, and import-free (it is served to the browser as
// an ES module), so the whole arbitration is unit-tested in
// Node with no DOM in sight.

/**
 * The global the injected reload client looks for before
 * reloading. Spelled here as well as in the server-side
 * `DevChannel` because a browser module cannot import from a
 * module that imports `plgg`; a spec asserts the two agree, so
 * the duplication cannot drift into a client that arbitrates
 * nothing.
 */
export const RELOAD_HOOK_NAME =
  "__plggpressOnReload";

/**
 * What the page is currently doing about reloads. `idle` is
 * the no-session state — the one that still reloads.
 */
export type ArbiterPhase =
  "idle" | "listening" | "swapping";

export type ArbiterState = Readonly<{
  phase: ArbiterPhase;
  /** A frame arrived mid-swap and is waiting for its turn. */
  pending: boolean;
}>;

/** What the arbiter learns. */
export type ArbiterMsg =
  | "SessionOpened"
  | "SessionClosed"
  | "ReloadFrame"
  | "SwapDone";

/** The only three things it can ask the page to do. */
export type ArbiterAction =
  "reload" | "swap" | "hold";

export const arbiterInit: ArbiterState = {
  phase: "idle",
  pending: false,
};

/** Step the arbitration: the next state, and what happens NOW. */
export const stepArbiter = (
  state: ArbiterState,
  msg: ArbiterMsg,
): readonly [ArbiterState, ArbiterAction] => {
  switch (msg) {
    case "SessionOpened":
      return [
        { phase: "listening", pending: false },
        "hold",
      ];
    case "SessionClosed":
      // Back to plain hot reload. A swap in flight is
      // abandoned, not awaited: the next frame reloads, which
      // is the honest thing once nothing needs protecting.
      return [arbiterInit, "hold"];
    case "ReloadFrame":
      return state.phase === "idle"
        ? [state, "reload"]
        : state.phase === "listening"
          ? [
              {
                phase: "swapping",
                pending: false,
              },
              "swap",
            ]
          : [
              {
                phase: "swapping",
                pending: true,
              },
              "hold",
            ];
    case "SwapDone":
      return state.phase !== "swapping"
        ? [state, "hold"]
        : state.pending
          ? [
              {
                phase: "swapping",
                pending: false,
              },
              "swap",
            ]
          : [
              {
                phase: "listening",
                pending: false,
              },
              "hold",
            ];
  }
};
