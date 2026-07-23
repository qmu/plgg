/**
 * The IO edge of PoC 4b — every side effect the reducer
 * returns as a `Cmd` value, plus the data-channel `Sub`.
 * Kept OUT of the pure reducer (app.ts) so the domain
 * stays testable offline: fetches, the Realtime mint +
 * open, the tool round-trips, and the reveal timer all
 * live here. Coverage-exempt (a `Cmd` thunk's body only
 * runs against a live browser + server); the reducer that
 * DECIDES which effect to run is the tested part.
 */
import {
  type SoftStr,
  type Option,
  type Result,
  type InvalidError,
  ok,
  err,
  some,
  none,
  pipe,
  matchOption,
  matchResult,
} from "plgg";
import {
  type Cmd,
  type Sub,
  cmdEffect,
  custom,
  subNone,
} from "plgg-view/client";
import { type FtsIndex } from "./poc1.ts";
import {
  type Msg,
  type Model,
  type Ready,
  type Applied,
} from "./app.ts";
import {
  type AgentEvent,
  type EditTrail,
  instructionsOf,
  eventOf,
  SEARCH_TOOL,
} from "./agent.ts";
import {
  type EditOp,
  type DocSegment,
  EDIT_TOOL,
} from "./edit.ts";
import {
  type SessionGrant,
  type EditReply,
  asSessionGrant,
  asEditReply,
} from "./protocol.ts";
import {
  openRealtime,
  closeRealtime,
  sendToolOutput,
  sendTextTurn as sendTextFrame,
  subscribeRealtime,
} from "./vendors/realtime.ts";

/** The erase phase's dwell before the new text writes in. */
export const REVEAL_MS = 340;

/* ------------------------------------------------ *
 * Asset + index decoding                            *
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

/* ------------------------------------------------ *
 * Commands (data the reducer returns)               *
 * ------------------------------------------------ */

export const loadAssets: Cmd<Msg> = cmdEffect(
  () =>
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
            (
              fts: FtsIndex,
            ): Result<Ready, Error> =>
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
 * Fetch the RAW markdown of one corpus file from the
 * shell's guarded read seam — the exact bytes the preview
 * shows and the model quotes. A read failure degrades to
 * an empty document, never a throw.
 */
export const fetchDocText = (
  file: SoftStr,
): Cmd<Msg> =>
  cmdEffect(() =>
    fetch(
      `./api/doc?path=${encodeURIComponent(file)}`,
    ).then(
      (res): Promise<Msg> =>
        (res.ok
          ? res.text()
          : Promise.reject(
              new Error(
                `./api/doc → ${res.status}`,
              ),
            )
        ).then((text: SoftStr): Msg => ({
          kind: "DocTextLoaded",
          file,
          result: ok(text),
        })),
      (cause): Msg => ({
        kind: "DocTextLoaded",
        file,
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
export const refetchIndex: Cmd<Msg> = cmdEffect(
  () =>
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

/** Mint the ephemeral key, then open the session. */
const mintAndOpen = (
  instructions: SoftStr,
): Promise<Msg> =>
  fetch("./api/session", { method: "POST" })
    .then((res) =>
      res
        .json()
        .catch((): unknown => ({}))
        .then(
          (json: unknown): Promise<Msg> | Msg =>
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
                      openRealtime(grant.value, {
                        instructions,
                        tools: [
                          SEARCH_TOOL,
                          EDIT_TOOL,
                        ],
                      }).then(
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
    }));

/**
 * Start a session: build the instructions from the open
 * document's already-loaded text (no second fetch), then
 * mint + open.
 */
export const startSession = (
  doc: Option<SoftStr>,
  docText: SoftStr,
): Cmd<Msg> =>
  cmdEffect(() =>
    mintAndOpen(
      instructionsOf(
        pipe(
          doc,
          matchOption(
            (): Option<
              Readonly<{
                file: SoftStr;
                text: SoftStr;
              }>
            > => none(),
            (
              file: SoftStr,
            ): Option<
              Readonly<{
                file: SoftStr;
                text: SoftStr;
              }>
            > => some({ file, text: docText }),
          ),
        ),
      ),
    ),
  );

export const stopSession: Cmd<Msg> = cmdEffect(
  () => {
    closeRealtime();
    return Promise.resolve<Msg>({
      kind: "SessionClosed",
    });
  },
);

export const toolReply = (
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
export const sendTextTurn = (
  text: SoftStr,
): Cmd<Msg> =>
  cmdEffect(() => {
    sendTextFrame(text);
    return Promise.resolve<Msg>({
      kind: "ToolReplied",
    });
  });

const spanCount = (
  segments: ReadonlyArray<DocSegment>,
): number =>
  segments.filter((s) => s.kind === "changed")
    .length;

/**
 * Execute one `edit_doc` call: the server round-trip
 * through the confined write seam. WHATEVER the outcome,
 * the model gets a function output (so the conversation
 * continues), and the page gets an edit-trail entry; on a
 * landed edit the reply's diff segments are what the
 * preview animates, so preview and disk agree.
 */
export const postEdit = (
  callId: SoftStr,
  path: SoftStr,
  edits: ReadonlyArray<EditOp>,
): Cmd<Msg> =>
  cmdEffect(() =>
    fetch("./api/edit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ path, edits }),
    })
      .then((res) =>
        res
          .json()
          .catch((): unknown => ({}))
          .then((json: unknown): Msg =>
            res.ok
              ? pipe(
                  asEditReply(json),
                  matchResult(
                    (e: InvalidError): Msg =>
                      refusedMsg(
                        callId,
                        path,
                        `the edit seam answered with an unexpected shape: ${e.content.message}`,
                      ),
                    (reply: EditReply): Msg => {
                      sendToolOutput(
                        callId,
                        JSON.stringify({
                          ok: true,
                          path: reply.path,
                          note: "the edit is on the preview and on disk — confirm to the writer what changed",
                        }),
                      );
                      const applied: Applied = {
                        text: reply.text,
                        segments: reply.segments,
                      };
                      const trail: EditTrail = {
                        path: reply.path,
                        outcome: {
                          kind: "landed",
                          spans: spanCount(
                            reply.segments,
                          ),
                        },
                      };
                      return {
                        kind: "EditFinished",
                        trail,
                        applied: some(applied),
                      };
                    },
                  ),
                )
              : refusedMsg(
                  callId,
                  path,
                  errorTextOf(res.status, json),
                ),
          ),
      )
      .catch((cause): Msg =>
        refusedMsg(
          callId,
          path,
          cause instanceof Error
            ? cause.message
            : String(cause),
        ),
      ),
  );

/** A refused edit: tell the model why, record the trail. */
const refusedMsg = (
  callId: SoftStr,
  path: SoftStr,
  reason: SoftStr,
): Msg => {
  sendToolOutput(
    callId,
    JSON.stringify({ error: reason }),
  );
  return {
    kind: "EditFinished",
    trail: {
      path,
      outcome: { kind: "refused", reason },
    },
    applied: none(),
  };
};

/**
 * The reveal tick: after the erase dwell, flip the latest
 * edit to its `writing` phase (tagged with the edit's seq
 * so a superseded reveal is ignored by the reducer).
 */
export const revealEdit = (
  seq: number,
): Cmd<Msg> =>
  cmdEffect(
    () =>
      new Promise<Msg>((resolve) => {
        setTimeout(
          () =>
            resolve({
              kind: "EditRevealed",
              seq,
            }),
          REVEAL_MS,
        );
      }),
  );

/* ------------------------------------------------ *
 * Subscriptions — the data channel → Msg stream     *
 * ------------------------------------------------ */

export const subscriptions = (
  model: Model,
): Sub<Msg> =>
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
