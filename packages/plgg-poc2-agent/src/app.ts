/**
 * PoC 2 — reader-side embedded browser agent. One
 * Elm-Architecture program: the reader asks a question,
 * the browser retrieves grounding evidence LOCALLY (PoC
 * 1's BM25 over the shipped index — no network), then the
 * one server seam (`POST /api/answer`) turns question +
 * evidence into a cited answer. Every exchange renders
 * the answer SIDE-BY-SIDE with the retrieved evidence, so
 * grounding quality is judged live; a canned ten-question
 * set runs the whole proof in one click.
 *
 * Sovereignty is stated, not hidden: the question and the
 * retrieved excerpts leave the browser for the model call
 * (unlike PoC 1's fully-local search); the corpus, the
 * index, and retrieval itself stay on-device, and the LLM
 * key never reaches this bundle (`answer.ts` is
 * server-only).
 */
import {
  type SoftStr,
  type Result,
  type InvalidError,
  type Option,
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
  cmdNone,
  cmdEffect,
} from "plgg-view/client";
import {
  type FtsIndex,
  type ChunkMeta,
  searchFts,
} from "./poc1.ts";
import {
  type SourceChunk,
  type GroundedAnswer,
  asGroundedAnswer,
} from "./protocol.ts";
import { view } from "./view.ts";
import {
  EVIDENCE_COUNT,
  CANNED_QUESTIONS,
} from "./canned.ts";

/** One retrieved chunk with its BM25 score. */
export type Evidence = Readonly<{
  chunk: ChunkMeta;
  score: number;
}>;

/**
 * Which shipped index grounded an exchange: the English
 * plgg guide, or the Japanese qmu.co.jp policy corpus
 * (segmenter-tokenized — PoC 1 Ticket B's measured
 * recommendation). The view picks the citation link base
 * and the evidence label from this.
 */
export type Corpus = "guide" | "qmu-ja";

/**
 * Retrieval routing: a question containing CJK characters
 * searches the Japanese index (BM25 cannot bridge
 * languages, so script IS the routing signal).
 */
export const hasCjk = (
  question: SoftStr,
): boolean =>
  // CJK punctuation/kana (U+3000–30FF), unified
  // ideographs (U+3400–9FFF), compatibility
  // ideographs (U+F900–FAFF), halfwidth kana
  // (U+FF66–FF9F).
  /[　-ヿ㐀-鿿豈-﫿ｦ-ﾟ]/.test(question);

export type Outcome =
  | Readonly<{ kind: "asking" }>
  | Readonly<{
      kind: "answered";
      answer: GroundedAnswer;
      ms: number;
    }>
  | Readonly<{
      kind: "failed";
      reason: SoftStr;
    }>;

/** One question's full trail: evidence + answer. */
export type Exchange = Readonly<{
  question: SoftStr;
  source: Corpus;
  evidence: ReadonlyArray<Evidence>;
  retrieveMs: number;
  outcome: Outcome;
}>;

/** What the app needs before it can answer. */
export type Ready = Readonly<{
  fts: FtsIndex;
  /**
   * The Japanese index (segmenter over the vendored
   * qmu.co.jp policy corpus). Optional: a missing
   * ja-fts.json degrades to English-only retrieval,
   * never a failed load — the PoC 1 contract.
   */
  jaFts: Option<FtsIndex>;
  /**
   * Whether the server seam holds a key — surfaced by
   * `/api/health` so the missing-key state is announced
   * up front, not discovered on the first failed ask.
   */
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
  draft: SoftStr;
  assets: AssetsPhase;
  /**
   * Append-ordered (oldest first) — `Answered` patches
   * by index, so this order is load-bearing; the view
   * renders it newest-first.
   */
  exchanges: ReadonlyArray<Exchange>;
  /** Canned questions still waiting their turn. */
  queue: ReadonlyArray<SoftStr>;
  /** One question in flight at a time. */
  busy: boolean;
}>;

export type Msg =
  | Readonly<{
      kind: "AssetsLoaded";
      result: Result<Ready, Error>;
    }>
  | Readonly<{
      kind: "DraftChanged";
      value: SoftStr;
    }>
  | Readonly<{ kind: "Submitted" }>
  | Readonly<{ kind: "CannedRequested" }>
  | Readonly<{
      kind: "Retrieved";
      question: SoftStr;
      source: Corpus;
      evidence: ReadonlyArray<Evidence>;
      retrieveMs: number;
    }>
  | Readonly<{
      kind: "Answered";
      at: number;
      result: Result<GroundedAnswer, SoftStr>;
      ms: number;
    }>;

export const init: Model = {
  draft: "",
  assets: { kind: "loading" },
  exchanges: [],
  queue: [],
  busy: false,
};

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

/**
 * Boundary re-shape: fts.json is produced by this
 * package's own build entry, so a structural sanity check
 * plus a re-key onto the typed shape guards fetch mix-ups
 * without re-validating thousands of rows (the PoC 1
 * decode contract).
 */
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
  fts: unknown,
  ja: unknown,
  health: unknown,
): Result<Ready, Error> =>
  looksFtsShape(fts)
    ? ok({
        fts: ftsOf(fts),
        jaFts: looksFtsShape(ja)
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
    // A missing Japanese index degrades to
    // English-only retrieval, never a failed load.
    fetchJson("./index/ja-fts.json").catch(
      (): unknown => null,
    ),
    // A failed health probe is an honest "not
    // configured", never a failed page load.
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
    ([fts, ja, health]): Msg => ({
      kind: "AssetsLoaded",
      result: decodeReady(fts, ja, health),
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

const runRetrieve = (
  index: FtsIndex,
  source: Corpus,
  question: SoftStr,
): Cmd<Msg> =>
  cmdEffect(() => {
    const started = performance.now();
    const hits = searchFts(index)(
      question,
      EVIDENCE_COUNT,
    );
    const retrieveMs =
      performance.now() - started;
    const evidence = hits.flatMap(
      (hit): ReadonlyArray<Evidence> =>
        pipe(
          fromNullable(index.chunks[hit.id]),
          matchOption(
            (): ReadonlyArray<Evidence> => [],
            (
              chunk: ChunkMeta,
            ): ReadonlyArray<Evidence> => [
              { chunk, score: hit.score },
            ],
          ),
        ),
    );
    return Promise.resolve<Msg>({
      kind: "Retrieved",
      question,
      source,
      evidence,
      retrieveMs,
    });
  });

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
    : `answer request failed (${status})`;
};

const askServer = (
  at: number,
  question: SoftStr,
  evidence: ReadonlyArray<Evidence>,
): Cmd<Msg> =>
  cmdEffect(() => {
    const started = performance.now();
    return fetch("./api/answer", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        question,
        chunks: evidence.map(
          (e): SourceChunk => ({
            id: e.chunk.id,
            file: e.chunk.file,
            headingPath: e.chunk.headingPath,
            text: e.chunk.text,
          }),
        ),
      }),
    })
      .then((res) =>
        res
          .json()
          .catch((): unknown => ({}))
          .then(
            (
              json: unknown,
            ): Result<GroundedAnswer, SoftStr> =>
              res.ok
                ? pipe(
                    asGroundedAnswer(json),
                    matchResult(
                      (
                        e: InvalidError,
                      ): Result<
                        GroundedAnswer,
                        SoftStr
                      > =>
                        err(
                          `the server answered with an unexpected shape: ${e.content.message}`,
                        ),
                      (
                        answer: GroundedAnswer,
                      ): Result<
                        GroundedAnswer,
                        SoftStr
                      > => ok(answer),
                    ),
                  )
                : err(
                    errorTextOf(res.status, json),
                  ),
          ),
      )
      .catch(
        (
          cause,
        ): Result<GroundedAnswer, SoftStr> =>
          err(
            cause instanceof Error
              ? cause.message
              : String(cause),
          ),
      )
      .then((result): Msg => ({
        kind: "Answered",
        at,
        result,
        ms: performance.now() - started,
      }));
  });

/* ------------------------------------------------ *
 * Update                                            *
 * ------------------------------------------------ */

/**
 * Start one question, single-flight guarded. A CJK
 * question searches the Japanese index when shipped
 * (script routing — see {@link hasCjk}); everything
 * else, including CJK with no JA index, searches the
 * guide.
 */
const ask = (
  model: Model,
  question: SoftStr,
): readonly [Model, Cmd<Msg>] => {
  if (
    model.assets.kind !== "ready" ||
    model.busy ||
    question === ""
  ) {
    return [model, cmdNone()];
  }
  const ready = model.assets.ready;
  const routed: readonly [FtsIndex, Corpus] =
    hasCjk(question) && isSome(ready.jaFts)
      ? [ready.jaFts.content, "qmu-ja"]
      : [ready.fts, "guide"];
  return [
    { ...model, busy: true, draft: "" },
    runRetrieve(routed[0], routed[1], question),
  ];
};

const outcomeOf = (
  result: Result<GroundedAnswer, SoftStr>,
  ms: number,
): Outcome =>
  pipe(
    result,
    matchResult(
      (reason: SoftStr): Outcome => ({
        kind: "failed",
        reason,
      }),
      (answer: GroundedAnswer): Outcome => ({
        kind: "answered",
        answer,
        ms,
      }),
    ),
  );

export const update = (
  msg: Msg,
  model: Model,
): readonly [Model, Cmd<Msg>] => {
  switch (msg.kind) {
    case "AssetsLoaded":
      return [
        {
          ...model,
          assets: pipe(
            msg.result,
            matchResult(
              (e: Error): AssetsPhase => ({
                kind: "failed",
                reason: e.message,
              }),
              (ready: Ready): AssetsPhase => ({
                kind: "ready",
                ready,
              }),
            ),
          ),
        },
        cmdNone(),
      ];
    case "DraftChanged":
      return [
        { ...model, draft: msg.value },
        cmdNone(),
      ];
    case "Submitted":
      return ask(model, model.draft.trim());
    case "CannedRequested":
      return model.busy
        ? [model, cmdNone()]
        : pipe(
            fromNullable(CANNED_QUESTIONS[0]),
            matchOption(
              (): readonly [Model, Cmd<Msg>] => [
                model,
                cmdNone(),
              ],
              (
                head: SoftStr,
              ): readonly [Model, Cmd<Msg>] =>
                ask(
                  {
                    ...model,
                    queue:
                      CANNED_QUESTIONS.slice(1),
                  },
                  head,
                ),
            ),
          );
    case "Retrieved":
      return [
        {
          ...model,
          exchanges: [
            ...model.exchanges,
            {
              question: msg.question,
              source: msg.source,
              evidence: msg.evidence,
              retrieveMs: msg.retrieveMs,
              outcome: { kind: "asking" },
            },
          ],
        },
        askServer(
          model.exchanges.length,
          msg.question,
          msg.evidence,
        ),
      ];
    case "Answered": {
      const exchanges = model.exchanges.map(
        (e, i): Exchange =>
          i === msg.at
            ? {
                ...e,
                outcome: outcomeOf(
                  msg.result,
                  msg.ms,
                ),
              }
            : e,
      );
      // Drained by re-entering `ask` per question so the
      // canned run and a hand-typed ask share one path.
      return pipe(
        fromNullable(model.queue[0]),
        matchOption(
          (): readonly [Model, Cmd<Msg>] => [
            {
              ...model,
              exchanges,
              busy: false,
            },
            cmdNone(),
          ],
          (
            next: SoftStr,
          ): readonly [Model, Cmd<Msg>] =>
            ask(
              {
                ...model,
                exchanges,
                queue: model.queue.slice(1),
                busy: false,
              },
              next,
            ),
        ),
      );
    }
  }
};

export const app: Sandbox<Model, Msg> = {
  init: [init, loadAssets],
  update,
  view,
};
