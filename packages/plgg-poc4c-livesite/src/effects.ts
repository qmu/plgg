/**
 * The IO edge of PoC 4c — every side effect the reducer
 * returns as a `Cmd` value, plus the two `Sub` streams
 * (the Realtime data channel, and the injected client's
 * reports coming back across the iframe boundary). Kept
 * OUT of the pure reducer (app.ts) so the domain stays
 * testable offline. Coverage-exempt (a `Cmd` thunk's body
 * only runs against a live browser + server); the reducer
 * that DECIDES which effect to run is the tested part.
 *
 * The 4c-specific effects are the three patch commands.
 * They are the only way this program can touch the real
 * rendered page: it does not own that document, so
 * "animate the span" is a postMessage into the iframe,
 * not a render.
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
  subBatch,
} from "plgg-view/client";
import { type FtsIndex } from "./poc1.ts";
import {
  type Msg,
  type Model,
  type Ready,
} from "./app.ts";
import {
  type AgentEvent,
  type EditTrail,
  type EditOp,
  type SessionGrant,
  type EditReply,
  instructionsOf,
  eventOf,
  asSessionGrant,
  asEditReply,
  SEARCH_TOOL,
  EDIT_TOOL,
} from "./poc4b.ts";
import {
  type PatchMessage,
  type PatchReport,
  asPatchReport,
  patchEnvelope,
} from "./bridge.ts";
import {
  openRealtime,
  closeRealtime,
  sendToolOutput,
  sendTextTurn as sendTextFrame,
  subscribeRealtime,
} from "./vendors/realtime.ts";

/** The id the view gives the real page's iframe. */
export const DOC_FRAME_ID = "doc-frame";

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
 * shell's guarded read seam — the exact bytes the model
 * quotes its `find` from. It must be the file itself, not
 * the rendered page's text: the model edits markdown, and
 * feeding it anything reconstructed is what corrupted
 * files in PoC 4.
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

/* ------------------------------------------------ *
 * The iframe bridge — reaching into the real page   *
 * ------------------------------------------------ */

/**
 * Post one message into the proxied document. Narrowed
 * with `instanceof`, never cast: if the frame is not up
 * yet the message is simply dropped, which is safe —
 * `arm` is the only one that matters early, and a client
 * that never armed just lets its reload through (PoC 4's
 * behaviour, the honest fallback).
 */
const postToFrame = (
  message: PatchMessage,
): void => {
  const frame =
    document.getElementById(DOC_FRAME_ID);
  if (frame instanceof HTMLIFrameElement) {
    frame.contentWindow?.postMessage(
      patchEnvelope(message),
      window.location.origin,
    );
  }
};

const patchCmd = (
  message: PatchMessage,
): Cmd<Msg> =>
  cmdEffect(() => {
    postToFrame(message);
    return Promise.resolve<Msg>({
      kind: "ToolReplied",
    });
  });

/** Tell the real page an edit is in flight. */
export const armPatch: Cmd<Msg> = patchCmd({
  kind: "arm",
});

/** Hand the real page the ops to animate. */
export const applyPatch = (
  ops: ReadonlyArray<EditOp>,
): Cmd<Msg> => patchCmd({ kind: "patch", ops });

/** Stand the real page down (the edit never landed). */
export const dropPatch: Cmd<Msg> = patchCmd({
  kind: "drop",
});

/* ------------------------------------------------ *
 * The edit round trip                               *
 * ------------------------------------------------ */

/**
 * Execute one `edit_doc` call: the server round-trip
 * through the confined write seam. WHATEVER the outcome,
 * the model gets a function output (so the conversation
 * continues), and the page gets an edit-trail entry. On a
 * landed edit the reply's OPS are what the injected client
 * animates against the real DOM — the same ops the server
 * just applied to disk, so the page and the file can never
 * disagree about what changed.
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
                          note: "the edit is on the rendered page and on disk — confirm to the writer what changed",
                        }),
                      );
                      const trail: EditTrail = {
                        path: reply.path,
                        outcome: {
                          kind: "landed",
                          spans: edits.length,
                        },
                      };
                      return {
                        kind: "EditFinished",
                        trail,
                        applied: some(edits),
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

/* ------------------------------------------------ *
 * Subscriptions                                     *
 * ------------------------------------------------ */

/**
 * The injected client's reports coming back. Always on
 * (not only while a session is live): the answer arrives
 * after the edit, and it is the PoC's measurement — a
 * dropped report would silently turn a known gap into an
 * unknown one.
 *
 * Same-origin is enforced on the way in as well as out:
 * the proxy is what makes the iframe same-origin, so
 * anything claiming otherwise is not our client.
 */
const bridgeSub: Sub<Msg> = custom(
  "bridge",
  (dispatch) => {
    const onMessage = (
      event: MessageEvent,
    ): void => {
      if (
        event.origin !== window.location.origin
      ) {
        return;
      }
      pipe(
        asPatchReport(event.data),
        matchResult(
          (): void => undefined,
          (report: PatchReport): void =>
            dispatch({
              kind: "PatchReported",
              report,
            }),
        ),
      );
    };
    window.addEventListener(
      "message",
      onMessage,
    );
    return () =>
      window.removeEventListener(
        "message",
        onMessage,
      );
  },
);

const realtimeSub: Sub<Msg> = custom(
  "realtime",
  (dispatch) =>
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
);

export const subscriptions = (
  model: Model,
): Sub<Msg> =>
  subBatch([
    bridgeSub,
    model.session.kind === "live" ||
    model.session.kind === "starting"
      ? realtimeSub
      : subNone(),
  ]);
