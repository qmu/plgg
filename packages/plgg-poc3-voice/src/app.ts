/**
 * PoC 3 — writer-side voice assistant. One
 * Elm-Architecture program: the writer opens a document,
 * starts a voice session (ephemeral key minted by the
 * server seam — the standing key never reaches this
 * bundle), and TALKS about the page. The assistant
 * grounds itself by DRIVING the browser-local full-text
 * search: every `search_docs` tool call runs PoC 1's
 * BM25 here in the browser, and the trail of keyword
 * variations it tried renders on the page — the visible
 * proof for the decision PoC 2's verdict locked.
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
  isSome,
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
  type Corpus,
  type Line,
  type ToolTrail,
  type AgentEvent,
  runSearchTool,
  docFiles,
  docTextOf,
  instructionsOf,
  eventOf,
  SEARCH_TOOL,
} from "./agent.ts";
import {
  type SessionGrant,
  asSessionGrant,
} from "./protocol.ts";
import {
  openRealtime,
  closeRealtime,
  sendToolOutput,
  subscribeRealtime,
} from "./vendors/realtime.ts";
import { view } from "./view.ts";

/** The document the writer has open. */
export type DocRef = Readonly<{
  corpus: Corpus;
  file: SoftStr;
}>;

export type SessionPhase =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "starting" }>
  | Readonly<{ kind: "live" }>
  | Readonly<{
      kind: "failed";
      reason: SoftStr;
    }>;

export type Ready = Readonly<{
  en: FtsIndex;
  /** Missing ja-fts.json degrades, never fails. */
  ja: Option<FtsIndex>;
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
  doc: Option<DocRef>;
  session: SessionPhase;
  transcript: ReadonlyArray<Line>;
  trail: ReadonlyArray<ToolTrail>;
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
      kind: "FromRealtime";
      event: AgentEvent;
    }>;

export const init: Model = {
  assets: { kind: "loading" },
  doc: none(),
  session: { kind: "idle" },
  transcript: [],
  trail: [],
};

/* ------------------------------------------------ *
 * Doc encoding for the <select>                     *
 * ------------------------------------------------ */

export const encodeDoc = (doc: DocRef): SoftStr =>
  `${doc.corpus}:${doc.file}`;

export const decodeDoc = (
  value: SoftStr,
): Option<DocRef> =>
  value.startsWith("guide:")
    ? some<DocRef>({
        corpus: "guide",
        file: value.slice("guide:".length),
      })
    : value.startsWith("qmu-ja:")
      ? some<DocRef>({
          corpus: "qmu-ja",
          file: value.slice("qmu-ja:".length),
        })
      : none();

/**
 * The document opened by default: tonight's article if
 * the JA corpus carries it, else the first JA article,
 * else the first guide page.
 */
export const defaultDoc = (
  ready: Ready,
): Option<DocRef> =>
  pipe(
    ready.ja,
    matchOption(
      (): Option<DocRef> =>
        pipe(
          fromNullable(docFiles(ready.en)[0]),
          matchOption(
            (): Option<DocRef> => none(),
            (file: SoftStr): Option<DocRef> =>
              some<DocRef>({
                corpus: "guide",
                file,
              }),
          ),
        ),
      (ja: FtsIndex): Option<DocRef> => {
        const files = docFiles(ja);
        const preferred = files.find(
          (f) =>
            f ===
            "implementation/objective-documentation.md",
        );
        return pipe(
          fromNullable(preferred ?? files[0]),
          matchOption(
            (): Option<DocRef> => none(),
            (file: SoftStr): Option<DocRef> =>
              some<DocRef>({
                corpus: "qmu-ja",
                file,
              }),
          ),
        );
      },
    ),
  );

/** The open document's text, from its index. */
export const openDocText = (
  ready: Ready,
  doc: Option<DocRef>,
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
      (ref: DocRef) => {
        const index =
          ref.corpus === "qmu-ja" &&
          isSome(ready.ja)
            ? ready.ja.content
            : ready.en;
        return some({
          file: ref.file,
          text: docTextOf(index, ref.file),
        });
      },
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

const decodeReady = (
  en: unknown,
  ja: unknown,
  health: unknown,
): Result<Ready, Error> =>
  looksFtsShape(en)
    ? ok({
        en: ftsOf(en),
        ja: looksFtsShape(ja)
          ? some(ftsOf(ja))
          : none(),
        configured: configuredOf(health),
      })
    : err(
        new Error(
          "index assets have an unexpected shape — rebuild with `npm run build`",
        ),
      );

const loadAssets: Cmd<Msg> = cmdEffect(() =>
  Promise.all([
    fetchJson("./index/fts.json"),
    fetchJson("./index/ja-fts.json").catch(
      (): unknown => null,
    ),
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
    ([en, ja, health]): Msg => ({
      kind: "AssetsLoaded",
      result: decodeReady(en, ja, health),
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
    : `session request failed (${status})`;
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
                            tools: [SEARCH_TOOL],
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
    case "ToolCalled": {
      if (model.assets.kind !== "ready") {
        return [model, cmdNone()];
      }
      const result = runSearchTool(
        model.assets.ready.en,
        model.assets.ready.ja,
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
        { ...model, doc: decodeDoc(msg.value) },
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
