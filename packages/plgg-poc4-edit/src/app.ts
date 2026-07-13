/**
 * PoC 4 — agent file edits with live hot reload over a
 * surviving Realtime session. One Elm-Architecture
 * program on PoC 3's proven scaffold, extended with the
 * four surfaces this PoC answers for:
 *
 * - the corpus is the seeded COPY of the plgg guide,
 *   rendered by plggpress dev inside an iframe (the doc
 *   pane hot-reloads; THIS shell never does);
 * - an `edit_file` tool next to `search_docs`, whose
 *   execution is a server round-trip through
 *   `POST /api/edit` (the confined write seam);
 * - a typed-text writer turn over the SAME data channel
 *   as the voice path (no second mint);
 * - after a landed edit the shipped index is refetched,
 *   so the very next `search_docs` sees the new text.
 */
import {
  type SoftStr,
  type Result,
  type Option,
  type InvalidError,
  ok,
  err,
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
  type Sub,
  cmdNone,
  cmdEffect,
  subNone,
  custom,
} from "plgg-view/client";
import { type FtsIndex } from "./poc1.ts";
import {
  type Line,
  type ToolTrail,
  type EditTrail,
  type AgentEvent,
  runSearchTool,
  docFiles,
  docTextOf,
  instructionsOf,
  eventOf,
  SEARCH_TOOL,
} from "./agent.ts";
import { EDIT_TOOL } from "./edit.ts";
import {
  type SessionGrant,
  asSessionGrant,
  type EditReply,
  asEditReply,
} from "./protocol.ts";
import {
  openRealtime,
  closeRealtime,
  sendToolOutput,
  sendTextTurn,
  subscribeRealtime,
} from "./vendors/realtime.ts";
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

export type Model = Readonly<{
  assets: AssetsPhase;
  /** The corpus-relative file open in the iframe. */
  doc: Option<SoftStr>;
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

/** The open document's text, from the index. */
export const openDocText = (
  ready: Ready,
  doc: Option<SoftStr>,
): Option<
  Readonly<{ file: SoftStr; text: SoftStr }>
> =>
  pipe(
    doc,
    matchOption(
      (): Option<
        Readonly<{
          file: SoftStr;
          text: SoftStr;
        }>
      > => none(),
      (file: SoftStr) =>
        some({
          file,
          text: docTextOf(ready.index, file),
        }),
    ),
  );

/* ------------------------------------------------ *
 * Effects (all returned as data from `update`)      *
 * ------------------------------------------------ */

const fetchJson = (
  path: SoftStr,
): Promise<unknown> =>
  fetch(path).then((res) =>
    res.ok
      ? res.json()
      : Promise.reject(
          new Error(`${path} → ${res.status}`),
        ),
  );

const looksFtsShape = (v: unknown): v is object =>
  typeof v === "object" &&
  v !== null &&
  "chunks" in v &&
  "postings" in v &&
  Array.isArray(Reflect.get(v, "chunks"));

const ftsOf = (raw: object): FtsIndex => {
  const chunks: unknown = Reflect.get(
    raw,
    "chunks",
  );
  const postings: unknown = Reflect.get(
    raw,
    "postings",
  );
  const avgLen: unknown = Reflect.get(
    raw,
    "avgLen",
  );
  const cjk: unknown = Reflect.get(raw, "cjk");
  return {
    chunks: Array.isArray(chunks) ? chunks : [],
    postings:
      typeof postings === "object" &&
      postings !== null
        ? Object.fromEntries(
            Object.entries(postings).filter(
              ([, v]) => Array.isArray(v),
            ),
          )
        : {},
    avgLen:
      typeof avgLen === "number" ? avgLen : 1,
    cjk:
      cjk === "segmenter" || cjk === "bigram"
        ? cjk
        : "none",
  };
};

const configuredOf = (v: unknown): boolean =>
  typeof v === "object" &&
  v !== null &&
  Reflect.get(v, "configured") === true;

const decodeIndex = (
  raw: unknown,
): Result<FtsIndex, Error> =>
  looksFtsShape(raw)
    ? ok(ftsOf(raw))
    : err(
        new Error(
          "the index asset has an unexpected shape — is the serve entry running against a seeded content/ copy?",
        ),
      );

const loadAssets: Cmd<Msg> = cmdEffect(() =>
  Promise.all([
    fetchJson("./index/fts.json"),
    fetch("./api/health")
      .then((res): Promise<unknown> =>
        res.ok
          ? res.json()
          : Promise.resolve({
              configured: false,
            }),
      )
      .catch((): unknown => ({
        configured: false,
      })),
  ]).then(
    ([index, health]): Msg => ({
      kind: "AssetsLoaded",
      result: pipe(
        decodeIndex(index),
        matchResult(
          (e: Error): Result<Ready, Error> =>
            err(e),
          (fts: FtsIndex): Result<Ready, Error> =>
            ok({
              index: fts,
              configured: configuredOf(health),
            }),
        ),
      ),
    }),
    (cause): Msg => ({
      kind: "AssetsLoaded",
      result: err(
        cause instanceof Error
          ? cause
          : new Error(String(cause)),
      ),
    }),
  ),
);

/**
 * After a landed edit: refetch the index the server just
 * rebuilt, so the next `search_docs` sees the new text.
 */
const refetchIndex: Cmd<Msg> = cmdEffect(() =>
  fetchJson("./index/fts.json").then(
    (raw): Msg => ({
      kind: "IndexRefreshed",
      result: decodeIndex(raw),
    }),
    (cause): Msg => ({
      kind: "IndexRefreshed",
      result: err(
        cause instanceof Error
          ? cause
          : new Error(String(cause)),
      ),
    }),
  ),
);

const errorTextOf = (
  status: number,
  json: unknown,
): SoftStr => {
  const message =
    typeof json === "object" && json !== null
      ? Reflect.get(json, "error")
      : undefined;
  return typeof message === "string"
    ? message
    : `request failed (${status})`;
};

/** Mint the ephemeral key, then open the session. */
const startSession = (
  instructions: SoftStr,
): Cmd<Msg> =>
  cmdEffect(() =>
    fetch("./api/session", { method: "POST" })
      .then((res) =>
        res
          .json()
          .catch((): unknown => ({}))
          .then(
            (
              json: unknown,
            ): Promise<Msg> | Msg =>
              res.ok
                ? pipe(
                    asSessionGrant(json),
                    matchResult(
                      (
                        e: InvalidError,
                      ): Promise<Msg> | Msg => ({
                        kind: "SessionFailed",
                        reason: `the mint answered with an unexpected shape: ${e.content.message}`,
                      }),
                      (
                        grant: SessionGrant,
                      ): Promise<Msg> =>
                        openRealtime(
                          grant.value,
                          {
                            instructions,
                            tools: [
                              SEARCH_TOOL,
                              EDIT_TOOL,
                            ],
                          },
                        ).then(
                          matchResult(
                            (
                              reason: SoftStr,
                            ): Msg => ({
                              kind: "SessionFailed",
                              reason,
                            }),
                            (): Msg => ({
                              kind: "SessionOpened",
                            }),
                          ),
                        ),
                    ),
                  )
                : {
                    kind: "SessionFailed",
                    reason: errorTextOf(
                      res.status,
                      json,
                    ),
                  },
          ),
      )
      .catch((cause): Msg => ({
        kind: "SessionFailed",
        reason:
          cause instanceof Error
            ? cause.message
            : String(cause),
      })),
  );

const stopSession: Cmd<Msg> = cmdEffect(() => {
  closeRealtime();
  return Promise.resolve<Msg>({
    kind: "SessionClosed",
  });
});

const toolReply = (
  callId: SoftStr,
  output: SoftStr,
): Cmd<Msg> =>
  cmdEffect(() => {
    sendToolOutput(callId, output);
    return Promise.resolve<Msg>({
      kind: "ToolReplied",
    });
  });

/** A typed writer turn over the live data channel. */
const sendText = (text: SoftStr): Cmd<Msg> =>
  cmdEffect(() => {
    sendTextTurn(text);
    return Promise.resolve<Msg>({
      kind: "ToolReplied",
    });
  });

/**
 * Execute one `edit_file` call: the server round-trip
 * through the confined write seam. WHATEVER the outcome,
 * the model gets a function output (so the conversation
 * continues), and the page gets an edit-trail entry.
 */
const postEdit = (
  callId: SoftStr,
  path: SoftStr,
  content: SoftStr,
): Cmd<Msg> =>
  cmdEffect(() =>
    fetch("./api/edit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ path, content }),
    })
      .then((res) =>
        res
          .json()
          .catch((): unknown => ({}))
          .then((json: unknown): Msg => {
            const outcome:
              | Readonly<{ kind: "landed" }>
              | Readonly<{
                  kind: "refused";
                  reason: SoftStr;
                }> = res.ok
              ? pipe(
                  asEditReply(json),
                  matchResult(
                    (
                      e: InvalidError,
                    ):
                      | Readonly<{
                          kind: "landed";
                        }>
                      | Readonly<{
                          kind: "refused";
                          reason: SoftStr;
                        }> => ({
                      kind: "refused",
                      reason: `the edit seam answered with an unexpected shape: ${e.content.message}`,
                    }),
                    (
                      _reply: EditReply,
                    ):
                      | Readonly<{
                          kind: "landed";
                        }>
                      | Readonly<{
                          kind: "refused";
                          reason: SoftStr;
                        }> => ({
                      kind: "landed",
                    }),
                  ),
                )
              : {
                  kind: "refused",
                  reason: errorTextOf(
                    res.status,
                    json,
                  ),
                };
            sendToolOutput(
              callId,
              JSON.stringify(
                outcome.kind === "landed"
                  ? {
                      ok: true,
                      path,
                      note: "the edit is on disk and the page is reloading — confirm to the writer what changed",
                    }
                  : { error: outcome.reason },
              ),
            );
            return {
              kind: "EditFinished",
              trail: { path, outcome },
            };
          }),
      )
      .catch((cause): Msg => {
        const reason =
          cause instanceof Error
            ? cause.message
            : String(cause);
        sendToolOutput(
          callId,
          JSON.stringify({ error: reason }),
        );
        return {
          kind: "EditFinished",
          trail: {
            path,
            outcome: {
              kind: "refused",
              reason,
            },
          },
        };
      }),
  );

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
          event.content,
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
          ): readonly [Model, Cmd<Msg>] => [
            {
              ...model,
              assets: { kind: "ready", ready },
              doc: defaultDoc(ready),
            },
            cmdNone(),
          ],
        ),
      );
    case "DocPicked":
      // The document is fixed per session: the select
      // is disabled while live, so a change here can
      // only happen before StartRequested.
      return [
        {
          ...model,
          doc:
            msg.value === ""
              ? none()
              : some(msg.value),
        },
        cmdNone(),
      ];
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
              instructionsOf(
                openDocText(
                  model.assets.ready,
                  model.doc,
                ),
              ),
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
            sendText(model.draft.trim()),
          ];
    case "EditFinished":
      return [
        {
          ...model,
          edits: [...model.edits, msg.trail],
        },
        msg.trail.outcome.kind === "landed"
          ? refetchIndex
          : cmdNone(),
      ];
    case "IndexRefreshed":
      return pipe(
        msg.result,
        matchResult(
          // A failed refresh keeps the last good
          // index — search degrades to slightly
          // stale, never to broken.
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
 * Subscriptions — the data channel → Msg stream     *
 * ------------------------------------------------ */

const subscriptions = (model: Model): Sub<Msg> =>
  model.session.kind === "live" ||
  model.session.kind === "starting"
    ? custom("realtime", (dispatch) =>
        subscribeRealtime((raw) =>
          pipe(
            eventOf(raw),
            matchOption(
              (): void => undefined,
              (event: AgentEvent): void =>
                dispatch({
                  kind: "FromRealtime",
                  event,
                }),
            ),
          ),
        ),
      )
    : subNone();

export const app: Sandbox<Model, Msg> = {
  init: [init, loadAssets],
  update,
  view,
  subscriptions,
};

/** Re-exported for the view (iframe src + labels). */
export { routeOf } from "./agent.ts";
