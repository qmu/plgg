/**
 * PoC 4c — watchable edits on the REAL rendered site. One
 * Elm-Architecture program on PoC 4/4b's proven Realtime
 * scaffold, re-aimed at the ONE question 4b left open:
 * does the animated in-place edit survive on a page this
 * program does not own?
 *
 * The reducer is the PURE domain layer — model + `update`,
 * total over plain data, tested offline by app.spec.ts.
 * Every side effect (fetch, WebRTC, the iframe postMessage)
 * is returned as a `Cmd` value built by `effects.ts`.
 *
 * What this reducer's shape says about the PoC:
 *
 * - There is an IFRAME again (4b retired it, 4 had it):
 *   the document pane is the real plggpress-rendered page,
 *   proxied under /docs/*. So the model holds no `docText`
 *   preview and no diff segments to render — the page is
 *   the renderer's, not ours.
 * - `patch` is therefore the PoC's whole measurement. An
 *   edit is `armed` before the write, then either
 *   `watched` (the injected client animated the span in
 *   place — the confidence signal) or `reloaded` (the span
 *   could not be mapped, so the reload was released and
 *   the writer saw PoC 4's behaviour instead). The reducer
 *   records WHICH, and the view says so out loud: an
 *   unreported gap would be worse than the gap.
 * - The animation itself is NOT here and cannot be. It
 *   happens inside the proxied document, in
 *   `patchClient.ts`.
 */
import {
  type SoftStr,
  type Result,
  type Option,
  some,
  none,
  pipe,
  fromNullable,
  matchOption,
  matchResult,
} from "plgg";
import {
  type Sandbox,
  type Cmd,
  cmdNone,
  cmdBatch,
} from "plgg-view/client";
import { type FtsIndex } from "./poc1.ts";
import {
  type Line,
  type ToolTrail,
  type EditTrail,
  type AgentEvent,
  type EditOp,
  runSearchTool,
  docFiles,
} from "./poc4b.ts";
import { type PatchReport } from "./bridge.ts";
import {
  loadAssets,
  fetchDocText,
  startSession,
  stopSession,
  toolReply,
  sendTextTurn,
  postEdit,
  armPatch,
  applyPatch,
  dropPatch,
  refetchIndex,
  subscriptions,
} from "./effects.ts";
import { view } from "./view.ts";

export type SessionPhase =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "starting" }>
  | Readonly<{ kind: "live" }>
  | Readonly<{
      kind: "failed";
      reason: SoftStr;
    }>;

export type Ready = Readonly<{
  index: FtsIndex;
  /** Whether the server seam holds a key. */
  configured: boolean;
}>;

export type AssetsPhase =
  | Readonly<{ kind: "loading" }>
  | Readonly<{
      kind: "failed";
      reason: SoftStr;
    }>
  | Readonly<{ kind: "ready"; ready: Ready }>;

/**
 * What became of the latest edit ON THE REAL PAGE — the
 * PoC's measurement, not decoration.
 *
 * `watched` is the confidence signal itself: the span
 * animated in place, no reload. `reloaded` is the honest
 * other half: the edit landed on disk, but its span could
 * not be pointed at on the rendered page, so the hot
 * reload was released and this became PoC 4. Both are
 * results; only a silent failure would not be.
 */
export type PatchPhase =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "armed" }>
  | Readonly<{ kind: "watched"; spans: number }>
  | Readonly<{
      kind: "reloaded";
      failure: SoftStr;
      reason: SoftStr;
    }>;

export type Model = Readonly<{
  assets: AssetsPhase;
  /** The corpus-relative file open in the iframe. */
  doc: Option<SoftStr>;
  /** The open document's raw text (the model's context). */
  docText: SoftStr;
  session: SessionPhase;
  patch: PatchPhase;
  transcript: ReadonlyArray<Line>;
  trail: ReadonlyArray<ToolTrail>;
  edits: ReadonlyArray<EditTrail>;
  /** The typed-turn input's current draft. */
  draft: SoftStr;
}>;

export type Msg =
  | Readonly<{
      kind: "AssetsLoaded";
      result: Result<Ready, Error>;
    }>
  | Readonly<{
      kind: "DocPicked";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "DocTextLoaded";
      file: SoftStr;
      result: Result<SoftStr, Error>;
    }>
  | Readonly<{ kind: "StartRequested" }>
  | Readonly<{ kind: "StopRequested" }>
  | Readonly<{ kind: "SessionOpened" }>
  | Readonly<{
      kind: "SessionFailed";
      reason: SoftStr;
    }>
  | Readonly<{ kind: "SessionClosed" }>
  | Readonly<{ kind: "ToolReplied" }>
  | Readonly<{
      kind: "DraftEdited";
      value: SoftStr;
    }>
  | Readonly<{ kind: "TextSubmitted" }>
  | Readonly<{
      kind: "EditFinished";
      trail: EditTrail;
      /** The ops to animate — `none` when refused. */
      applied: Option<ReadonlyArray<EditOp>>;
    }>
  | Readonly<{
      kind: "PatchReported";
      report: PatchReport;
    }>
  | Readonly<{
      kind: "IndexRefreshed";
      result: Result<FtsIndex, Error>;
    }>
  | Readonly<{
      kind: "FromRealtime";
      event: AgentEvent;
    }>;

export const init: Model = {
  assets: { kind: "loading" },
  doc: none(),
  docText: "",
  session: { kind: "idle" },
  patch: { kind: "idle" },
  transcript: [],
  trail: [],
  edits: [],
  draft: "",
};

/**
 * The document opened by default: the guide's front page
 * when the copy carries it, else the first corpus file.
 */
export const defaultDoc = (
  ready: Ready,
): Option<SoftStr> => {
  const files = docFiles(ready.index);
  return pipe(
    fromNullable(
      files.find((f) => f === "index.md") ??
        files[0],
    ),
    matchOption(
      (): Option<SoftStr> => none(),
      (file: SoftStr): Option<SoftStr> =>
        some(file),
    ),
  );
};

/* ------------------------------------------------ *
 * Update                                            *
 * ------------------------------------------------ */

const onEvent = (
  model: Model,
  event: AgentEvent,
): readonly [Model, Cmd<Msg>] => {
  switch (event.kind) {
    case "WriterSaid":
      return [
        {
          ...model,
          transcript: [
            ...model.transcript,
            { who: "writer", text: event.text },
          ],
        },
        cmdNone(),
      ];
    case "AssistantSaid":
      return [
        {
          ...model,
          transcript: [
            ...model.transcript,
            {
              who: "assistant",
              text: event.text,
            },
          ],
        },
        cmdNone(),
      ];
    case "SearchCalled": {
      if (model.assets.kind !== "ready") {
        return [model, cmdNone()];
      }
      const result = runSearchTool(
        model.assets.ready.index,
        event.keywords,
      );
      return [
        {
          ...model,
          trail: [...model.trail, result.trail],
        },
        toolReply(event.callId, result.output),
      ];
    }
    case "EditCalled":
      // ARM the injected client BEFORE the write goes
      // out. The dev server's watcher can push its reload
      // frame before our own HTTP response comes back, and
      // an unarmed client would reload the page out from
      // under the patch it is about to be handed.
      return [
        { ...model, patch: { kind: "armed" } },
        cmdBatch([
          armPatch,
          postEdit(
            event.callId,
            event.path,
            event.edits,
          ),
        ]),
      ];
    case "SessionErrored":
      return [
        {
          ...model,
          session: {
            kind: "failed",
            reason: event.reason,
          },
        },
        stopSession,
      ];
  }
};

export const update = (
  msg: Msg,
  model: Model,
): readonly [Model, Cmd<Msg>] => {
  switch (msg.kind) {
    case "AssetsLoaded":
      return pipe(
        msg.result,
        matchResult(
          (
            e: Error,
          ): readonly [Model, Cmd<Msg>] => [
            {
              ...model,
              assets: {
                kind: "failed",
                reason: e.message,
              },
            },
            cmdNone(),
          ],
          (
            ready: Ready,
          ): readonly [Model, Cmd<Msg>] =>
            pipe(
              defaultDoc(ready),
              (
                doc: Option<SoftStr>,
              ): readonly [Model, Cmd<Msg>] => [
                {
                  ...model,
                  assets: {
                    kind: "ready",
                    ready,
                  },
                  doc,
                },
                pipe(
                  doc,
                  matchOption(
                    (): Cmd<Msg> => cmdNone(),
                    (file: SoftStr): Cmd<Msg> =>
                      fetchDocText(file),
                  ),
                ),
              ],
            ),
        ),
      );
    case "DocPicked":
      // The document is fixed per session: the select is
      // disabled while live, so a change here can only
      // happen before StartRequested.
      return msg.value === ""
        ? [
            { ...model, doc: none(), docText: "" },
            cmdNone(),
          ]
        : [
            { ...model, doc: some(msg.value) },
            fetchDocText(msg.value),
          ];
    case "DocTextLoaded":
      // A stale answer (the writer changed document while
      // this was in flight) is dropped, not applied.
      return pipe(
        model.doc,
        matchOption(
          (): readonly [Model, Cmd<Msg>] => [
            model,
            cmdNone(),
          ],
          (
            open: SoftStr,
          ): readonly [Model, Cmd<Msg>] =>
            open !== msg.file
              ? [model, cmdNone()]
              : pipe(
                  msg.result,
                  matchResult(
                    // A failed read degrades the model's
                    // context to empty, never to broken:
                    // it can still search.
                    (): readonly [
                      Model,
                      Cmd<Msg>,
                    ] => [
                      { ...model, docText: "" },
                      cmdNone(),
                    ],
                    (
                      text: SoftStr,
                    ): readonly [
                      Model,
                      Cmd<Msg>,
                    ] => [
                      { ...model, docText: text },
                      cmdNone(),
                    ],
                  ),
                ),
        ),
      );
    case "StartRequested":
      return model.assets.kind !== "ready" ||
        model.session.kind === "starting" ||
        model.session.kind === "live"
        ? [model, cmdNone()]
        : [
            {
              ...model,
              session: { kind: "starting" },
            },
            startSession(
              model.doc,
              model.docText,
            ),
          ];
    case "StopRequested":
      return model.session.kind === "live" ||
        model.session.kind === "starting"
        ? [model, stopSession]
        : [model, cmdNone()];
    case "SessionOpened":
      return [
        { ...model, session: { kind: "live" } },
        cmdNone(),
      ];
    case "SessionFailed":
      return [
        {
          ...model,
          session: {
            kind: "failed",
            reason: msg.reason,
          },
        },
        cmdNone(),
      ];
    case "SessionClosed":
      return model.session.kind === "failed"
        ? [model, cmdNone()]
        : [
            {
              ...model,
              session: { kind: "idle" },
            },
            cmdNone(),
          ];
    case "ToolReplied":
      return [model, cmdNone()];
    case "DraftEdited":
      return [
        { ...model, draft: msg.value },
        cmdNone(),
      ];
    case "TextSubmitted":
      // The typed path shares the live session: the
      // writer line is appended HERE (Whisper only
      // transcribes the voice path), and the frames go
      // over the same data channel — no second mint.
      return model.session.kind !== "live" ||
        model.draft.trim() === ""
        ? [model, cmdNone()]
        : [
            {
              ...model,
              draft: "",
              transcript: [
                ...model.transcript,
                {
                  who: "writer",
                  text: model.draft.trim(),
                },
              ],
            },
            sendTextTurn(model.draft.trim()),
          ];
    case "EditFinished":
      return [
        {
          ...model,
          edits: [...model.edits, msg.trail],
        },
        pipe(
          msg.applied,
          matchOption(
            // Refused: nothing landed, so stand the
            // injected client down — a client left armed
            // would swallow the NEXT external reload.
            (): Cmd<Msg> => dropPatch,
            (
              ops: ReadonlyArray<EditOp>,
            ): Cmd<Msg> =>
              cmdBatch([
                applyPatch(ops),
                refetchIndex,
              ]),
          ),
        ),
      ];
    case "PatchReported":
      // The injected client's honest answer about the
      // REAL page. `unmapped` is not an error path: the
      // edit is on disk and the released reload is
      // showing it — the writer just did not get to
      // WATCH it. Recording it is what makes the PoC's
      // gap measurable instead of anecdotal.
      return [
        {
          ...model,
          patch:
            msg.report.kind === "applied"
              ? {
                  kind: "watched",
                  spans: msg.report.spans,
                }
              : {
                  kind: "reloaded",
                  failure: msg.report.failure,
                  reason: msg.report.reason,
                },
        },
        cmdNone(),
      ];
    case "IndexRefreshed":
      return pipe(
        msg.result,
        matchResult(
          // A failed refresh keeps the last good index —
          // search degrades to slightly stale, never to
          // broken.
          (): readonly [Model, Cmd<Msg>] => [
            model,
            cmdNone(),
          ],
          (
            index: FtsIndex,
          ): readonly [Model, Cmd<Msg>] =>
            model.assets.kind === "ready"
              ? [
                  {
                    ...model,
                    assets: {
                      kind: "ready",
                      ready: {
                        ...model.assets.ready,
                        index,
                      },
                    },
                  },
                  cmdNone(),
                ]
              : [model, cmdNone()],
        ),
      );
    case "FromRealtime":
      return onEvent(model, msg.event);
  }
};

export const app: Sandbox<Model, Msg> = {
  init: [init, loadAssets],
  update,
  view,
  subscriptions,
};

/** Re-exported for the view (iframe src + labels). */
export { routeOf } from "./docRoute.ts";
