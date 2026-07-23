/**
 * PoC 4b — the live co-editing experience. One
 * Elm-Architecture program on PoC 4's proven Realtime
 * scaffold, re-aimed at the EXPERIENCE question: the
 * change happens ON the preview.
 *
 * The reducer is the PURE domain layer — model + `update`,
 * total over plain data, tested offline by app.spec.ts.
 * Every side effect (fetch, WebRTC, the reveal timer) is
 * returned as a `Cmd` value built by `effects.ts`; nothing
 * here does IO. Four things this PoC changed from PoC 4
 * live in this reducer's shape:
 *
 * - `docText` + `preview`: the open document is a surface
 *   THIS program renders and PATCHES in place — no iframe,
 *   no reload. `preview` is the pure diff of the latest
 *   edit (kept/changed segments) the view animates/diffs.
 * - `editSeq` + `editPhase`: the two-phase erase→write
 *   animation. A landed edit bumps `editSeq` (so keyed
 *   reconciliation re-triggers the motion) and enters
 *   `erasing`; a reveal tick flips it to `writing`.
 * - `vizMode`: the toggle between the two compared
 *   visualizations (micro-animation vs before/after diff).
 * - edits are GRANULAR (`{find, replace}` ops), so a
 *   change is a small, addressable, watchable delta.
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
  runSearchTool,
  docFiles,
} from "./agent.ts";
import {
  type DocSegment,
  wholeDocSegments,
} from "./edit.ts";
import {
  loadAssets,
  fetchDocText,
  startSession,
  stopSession,
  toolReply,
  sendTextTurn,
  postEdit,
  refetchIndex,
  revealEdit,
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

/** The two compared change visualizations. */
export type VizMode = "animation" | "diff";

/**
 * The latest edit's animation phase — only the
 * micro-animation mode reads it. `erasing` shows the old
 * span fading/striking out; `writing` shows the new text
 * writing in.
 */
export type EditPhase =
  "idle" | "erasing" | "writing";

/** What a landed edit applied: the new text + its diff. */
export type Applied = Readonly<{
  text: SoftStr;
  segments: ReadonlyArray<DocSegment>;
}>;

export type Model = Readonly<{
  assets: AssetsPhase;
  /** The corpus-relative file open in the preview. */
  doc: Option<SoftStr>;
  /** The open document's current text (preview base). */
  docText: SoftStr;
  /** The preview segmentation — latest edit annotated. */
  preview: ReadonlyArray<DocSegment>;
  /** Bumped per landed edit so keyed motion re-triggers. */
  editSeq: number;
  editPhase: EditPhase;
  vizMode: VizMode;
  session: SessionPhase;
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
      kind: "VizModePicked";
      mode: VizMode;
    }>
  | Readonly<{
      kind: "EditFinished";
      trail: EditTrail;
      applied: Option<Applied>;
    }>
  | Readonly<{
      kind: "EditRevealed";
      seq: number;
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
  preview: [],
  editSeq: 0,
  editPhase: "idle",
  vizMode: "animation",
  session: { kind: "idle" },
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
      return [
        model,
        postEdit(
          event.callId,
          event.path,
          event.edits,
        ),
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
          ): readonly [Model, Cmd<Msg>] => {
            const doc = defaultDoc(ready);
            return [
              {
                ...model,
                assets: { kind: "ready", ready },
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
            ];
          },
        ),
      );
    case "DocPicked":
      // The document is fixed per session: the select is
      // disabled while live, so a change here can only
      // happen before StartRequested. Picking resets the
      // preview to the freshly-loaded text.
      return msg.value === ""
        ? [
            {
              ...model,
              doc: none(),
              docText: "",
              preview: [],
              editPhase: "idle",
            },
            cmdNone(),
          ]
        : [
            { ...model, doc: some(msg.value) },
            fetchDocText(msg.value),
          ];
    case "DocTextLoaded":
      // Ignore a stale load for a doc no longer open.
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
                    (): readonly [
                      Model,
                      Cmd<Msg>,
                    ] => [
                      {
                        ...model,
                        docText: "",
                        preview: [],
                        editPhase: "idle",
                      },
                      cmdNone(),
                    ],
                    (
                      text: SoftStr,
                    ): readonly [
                      Model,
                      Cmd<Msg>,
                    ] => [
                      {
                        ...model,
                        docText: text,
                        preview:
                          wholeDocSegments(text),
                        editPhase: "idle",
                      },
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
    case "VizModePicked":
      return [
        { ...model, vizMode: msg.mode },
        cmdNone(),
      ];
    case "EditFinished":
      return pipe(
        msg.applied,
        matchOption(
          // Refused: record the trail, leave the preview
          // untouched (the disk did not change).
          (): readonly [Model, Cmd<Msg>] => [
            {
              ...model,
              edits: [...model.edits, msg.trail],
            },
            cmdNone(),
          ],
          // Landed: swap the preview to the returned diff,
          // enter the erase phase, and batch the index
          // refetch with the reveal tick that flips to the
          // write phase.
          (
            applied: Applied,
          ): readonly [Model, Cmd<Msg>] => {
            const editSeq = model.editSeq + 1;
            return [
              {
                ...model,
                docText: applied.text,
                preview: applied.segments,
                editSeq,
                editPhase: "erasing",
                edits: [
                  ...model.edits,
                  msg.trail,
                ],
              },
              cmdBatch([
                refetchIndex,
                revealEdit(editSeq),
              ]),
            ];
          },
        ),
      );
    case "EditRevealed":
      // Ignore a stale reveal (a newer edit already
      // superseded this one).
      return msg.seq !== model.editSeq
        ? [model, cmdNone()]
        : [
            { ...model, editPhase: "writing" },
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

/* ------------------------------------------------ *
 * Assembly                                          *
 * ------------------------------------------------ */

/**
 * The program. `init`, `update`, and the model/message
 * types are the pure domain layer (this file, tested by
 * app.spec.ts); the initial `loadAssets` command and the
 * data-channel `subscriptions` are IO built by effects.ts,
 * and `view` is the render tree — assembled here.
 */
export const app: Sandbox<Model, Msg> = {
  init: [init, loadAssets],
  update,
  view,
  subscriptions,
};
