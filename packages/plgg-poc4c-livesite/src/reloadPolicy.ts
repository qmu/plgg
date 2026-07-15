/**
 * THE SECOND RESEARCH SURFACE OF PoC 4c — reconciling the
 * in-place patch with the dev server's hot reload.
 *
 * The two mechanisms want the same page. plggpress's dev
 * server watches `content/`, and the agent's edit IS a
 * write to `content/`, so every landed edit pushes a
 * reload frame down `/__plgg_reload` — which would blow
 * the patch (and the animation the writer is watching)
 * away a beat after it starts. PoC 4b sidestepped this by
 * retiring the iframe; 4c cannot, because the real
 * rendered page is the whole point.
 *
 * So the reload is not suppressed, it is ARBITRATED, and
 * this pure state machine is the arbiter. The rule in one
 * line: **absorb the reload our own edit caused, let every
 * other reload through.**
 *
 * - An edit the client PATCHED already shows the new text
 *   — the animation is the truth, and reloading would
 *   only flicker it away. Absorb.
 * - An edit that could NOT be mapped onto a rendered span
 *   ({@link ./spanMap.ts} refused it) has still landed on
 *   disk. Here the reload is the ONLY thing that tells the
 *   writer the truth, so it is released — and the PoC
 *   degrades to exactly PoC 4's proven behaviour rather
 *   than to a stale page. This is why an unmappable edit
 *   is a reported gap and not a failure.
 * - A reload from anything else (the developer editing the
 *   corpus in their editor while the container serves) is
 *   none of our business. Let it through — PoC 4's
 *   hot-reload verdict must keep holding.
 *
 * Pure and total, so the whole arbitration is unit-tested
 * offline; the EventSource and `location.reload()` live at
 * the edge in `patchClient.ts`.
 */
/**
 * The dev server's own reload route, imported from its
 * protocol module rather than re-spelled: the injected
 * client opens THIS stream, so a drifted constant would
 * mean a client listening to nothing — and a PoC that
 * looked like it absorbed every reload because it never
 * heard one.
 */
export { RELOAD_PATH } from "../../plgg-bundle/src/Dev/model/Protocol.ts";

/**
 * What the injected client is currently doing about an
 * edit. `armed` spans the whole `/api/edit` round trip —
 * it is entered BEFORE the request is sent, on purpose:
 * the file write (and therefore the reload frame) can
 * easily beat the HTTP response back, and an unarmed
 * client would reload out from under the patch it is
 * about to receive.
 */
export type Phase = "quiet" | "armed" | "patched";

export type PatchState = Readonly<{
  phase: Phase;
  /**
   * A reload frame arrived while armed and was held. If
   * the edit turns out to be unmappable, this is what
   * gets released.
   */
  held: boolean;
}>;

export const patchInit: PatchState = {
  phase: "quiet",
  held: false,
};

/**
 * What the injected client learns, from the parent shell
 * (`Armed`/`Patched`/`Dropped`, posted across the iframe
 * boundary) or from the dev server (`ReloadFrame`).
 *
 * `Dropped` is BOTH refusals in one: the server refused
 * the edit, or the span could not be mapped. They differ
 * in why, never in what to do — in both cases this client
 * is not showing the change, so the reload must be
 * released.
 */
export type PatchMsg =
  | "Armed"
  | "Patched"
  | "Dropped"
  | "ReloadFrame";

/** The only thing this machine can do to the page. */
export type ReloadAction = "hold" | "reload";

/**
 * Step the arbitration. Returns the next state and
 * whether the page reloads NOW.
 */
export const stepPatch = (
  state: PatchState,
  msg: PatchMsg,
): readonly [PatchState, ReloadAction] => {
  switch (msg) {
    case "Armed":
      return [
        { phase: "armed", held: false },
        "hold",
      ];
    case "ReloadFrame":
      // Quiet: somebody else changed the corpus (the
      // developer's own editor). PoC 4's hot reload is a
      // recorded verdict — do not regress it.
      return state.phase === "quiet"
        ? [state, "reload"]
        : // Armed: this is almost certainly the frame our
          // own in-flight write caused. Hold it until we
          // know whether the patch lands.
          state.phase === "armed"
          ? [
              { phase: "armed", held: true },
              "hold",
            ]
          : // Patched: the trailing frame from our own
            // write, arriving after the animation began.
            // Absorb this one and return to quiet, so the
            // NEXT external edit still reloads.
            [patchInit, "hold"];
    case "Patched":
      // The animation is now the truth on this page. Any
      // frame we held was caused by the very write we just
      // painted, so it is dropped, not released.
      return [
        { phase: "patched", held: false },
        "hold",
      ];
    case "Dropped":
      // We are NOT showing the change. If the write's
      // reload frame already arrived, release it now; if
      // it has not, going quiet means the frame reloads
      // when it lands. Either way the page ends up honest.
      return [
        patchInit,
        state.held ? "reload" : "hold",
      ];
  }
};
