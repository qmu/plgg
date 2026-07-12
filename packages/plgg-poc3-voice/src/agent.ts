/**
 * The pure heart of PoC 3: everything the voice loop
 * needs that is NOT a browser API — the Realtime event
 * decoder, the search tool executor, the session
 * instructions, and the tool schema. All total
 * functions over plain data, unit-tested offline; the
 * WebRTC/microphone wiring lives in `vendors/` and only
 * moves bytes.
 *
 * The locked decision this module embodies (developer,
 * PoC 2 live judging): the AGENT drives the search. The
 * model calls `search_docs` repeatedly with its own
 * keyword variations until the corpus vocabulary
 * matches — the writer's phrasing never needs to hit
 * the index directly.
 */
import {
  type SoftStr,
  type Option,
  type InvalidError,
  some,
  none,
  isSome,
  pipe,
  tryCatch,
  invalidError,
  matchResult,
} from "plgg";
import {
  type FtsIndex,
  type ChunkMeta,
  searchFts,
} from "./poc1.ts";

/** Which shipped index a search ran against. */
export type Corpus = "guide" | "qmu-ja";

/**
 * Script routing, shared with PoC 2: CJK keywords search
 * the Japanese index (BM25 cannot bridge languages).
 */
export const hasCjk = (
  keywords: SoftStr,
): boolean =>
  /[　-ヿ㐀-鿿豈-﫿ｦ-ﾟ]/.test(keywords);

/** One transcript line of the voice conversation. */
export type Line = Readonly<{
  who: "writer" | "assistant";
  text: SoftStr;
}>;

export type ToolHit = Readonly<{
  headingPath: SoftStr;
  score: number;
}>;

/**
 * One `search_docs` call as the page shows it — the
 * visible proof that the agent tries keyword variations
 * against the index.
 */
export type ToolTrail = Readonly<{
  keywords: SoftStr;
  corpus: Corpus;
  hits: ReadonlyArray<ToolHit>;
}>;

/**
 * What executing the tool yields: the trail entry for
 * the page, and the JSON payload the model receives as
 * its function output.
 */
export type ToolResult = Readonly<{
  trail: ToolTrail;
  output: SoftStr;
}>;

export const SEARCH_RESULT_COUNT = 5;

/**
 * Execute one `search_docs` call — pure BM25 over the
 * shipped indexes, routed by the KEYWORDS' script. An
 * empty result tells the model, in words, to try other
 * keywords rather than give up.
 */
export const runSearchTool = (
  en: FtsIndex,
  ja: Option<FtsIndex>,
  keywords: SoftStr,
): ToolResult => {
  const routed: readonly [FtsIndex, Corpus] =
    hasCjk(keywords) && isSome(ja)
      ? [ja.content, "qmu-ja"]
      : [en, "guide"];
  const index = routed[0];
  const scored = searchFts(index)(
    keywords,
    SEARCH_RESULT_COUNT,
  );
  const chunks = scored.flatMap((s) => {
    const chunk = index.chunks[s.id];
    return chunk === undefined
      ? []
      : [{ chunk, score: s.score }];
  });
  return {
    trail: {
      keywords,
      corpus: routed[1],
      hits: chunks.map(
        ({ chunk, score }): ToolHit => ({
          headingPath: chunk.headingPath,
          score,
        }),
      ),
    },
    output: JSON.stringify(
      chunks.length === 0
        ? {
            corpus: routed[1],
            results: [],
            note: "no match — call search_docs again with different keywords in the corpus's own vocabulary (Japanese for qmu.co.jp policies, English for the plgg guide)",
          }
        : {
            corpus: routed[1],
            results: chunks.map(({ chunk }) => ({
              headingPath: chunk.headingPath,
              text: chunk.text,
            })),
          },
    ),
  };
};

/* ------------------------------------------------ *
 * Documents (the "same page" the writer is on)      *
 * ------------------------------------------------ */

/** Distinct source files of an index, in file order. */
export const docFiles = (
  index: FtsIndex,
): ReadonlyArray<SoftStr> => [
  ...new Set(
    index.chunks.map((chunk) => chunk.file),
  ),
];

/**
 * Reassemble a document's readable text from its
 * chunks (they are in document order by construction).
 */
export const docTextOf = (
  index: FtsIndex,
  file: SoftStr,
): SoftStr =>
  index.chunks
    .filter((chunk) => chunk.file === file)
    .map(
      (chunk: ChunkMeta) =>
        `## ${chunk.headingPath}\n${chunk.text}`,
    )
    .join("\n\n");

/** Keep instructions bounded; the doc can be large. */
export const DOC_BUDGET = 6000;

/**
 * The session instructions: who the assistant is, HOW
 * it must ground itself (drive the tool, vary the
 * keywords, cite heading paths, speak the writer's
 * language), and the open document itself.
 */
export const instructionsOf = (
  doc: Option<
    Readonly<{ file: SoftStr; text: SoftStr }>
  >,
): SoftStr =>
  [
    "You are the writer-side voice assistant embedded in a documentation site.",
    "The writer is looking at the open document below; you are on the same page.",
    "Ground every factual claim by calling the search_docs tool before answering.",
    "The search is exact-term BM25: if results miss, call the tool AGAIN with different keyword variations in the corpus's own vocabulary (the qmu.co.jp policies are written in Japanese — e.g. 文書化, not ドキュメンテーション; the plgg guide is English).",
    "When you answer, name the heading paths of the sources you used.",
    "Speak in the language the writer speaks.",
    ...pipe(
      doc,
      (
        d: Option<
          Readonly<{
            file: SoftStr;
            text: SoftStr;
          }>
        >,
      ) =>
        isSome(d)
          ? [
              `Open document (${d.content.file}):`,
              d.content.text.slice(0, DOC_BUDGET),
            ]
          : [
              "No document is open yet — the writer may open one during the session.",
            ],
    ),
  ].join("\n\n");

/** The one tool the Realtime session exposes. */
export const SEARCH_TOOL = {
  type: "function",
  name: "search_docs",
  description:
    "Full-text search (BM25, exact-term) over the site's documents. Japanese keywords search the qmu.co.jp policy articles; English keywords search the plgg guide. Call repeatedly with different keyword variations until the results match the topic.",
  parameters: {
    type: "object",
    properties: {
      keywords: {
        type: "string",
        description:
          "Space-separated search keywords, phrased in the corpus's own vocabulary",
      },
    },
    required: ["keywords"],
    additionalProperties: false,
  },
};

/* ------------------------------------------------ *
 * Realtime event decoding (data channel → domain)   *
 * ------------------------------------------------ */

/** What the voice loop can learn from one event. */
export type AgentEvent =
  | Readonly<{
      kind: "WriterSaid";
      text: SoftStr;
    }>
  | Readonly<{
      kind: "AssistantSaid";
      text: SoftStr;
    }>
  | Readonly<{
      kind: "ToolCalled";
      callId: SoftStr;
      keywords: SoftStr;
    }>
  | Readonly<{
      kind: "SessionErrored";
      reason: SoftStr;
    }>;

const strAt = (
  v: unknown,
  key: string,
): SoftStr => {
  const got: unknown =
    typeof v === "object" && v !== null
      ? Reflect.get(v, key)
      : undefined;
  return typeof got === "string" ? got : "";
};

const objAt = (
  v: unknown,
  key: string,
): unknown =>
  typeof v === "object" && v !== null
    ? Reflect.get(v, key)
    : undefined;

/** `arguments` is a JSON string; a bad one is "". */
const keywordsOf = (raw: SoftStr): SoftStr =>
  pipe(
    tryCatch(
      (t: SoftStr): unknown => JSON.parse(t),
      (cause): InvalidError =>
        invalidError({
          message: "arguments not JSON",
          cause,
        }),
    )(raw),
    matchResult(
      (): SoftStr => "",
      (parsed: unknown): SoftStr =>
        strAt(parsed, "keywords"),
    ),
  );

/**
 * Decode one Realtime data-channel event into the ONE
 * domain event it means, if any. Total: unknown event
 * types are `none()`, never a throw — the protocol can
 * grow without breaking the loop.
 */
export const eventOf = (
  raw: unknown,
): Option<AgentEvent> => {
  const type = strAt(raw, "type");
  if (type === "error") {
    return some<AgentEvent>({
      kind: "SessionErrored",
      reason:
        strAt(objAt(raw, "error"), "message") ||
        "the realtime session reported an error",
    });
  }
  if (
    type ===
    "conversation.item.input_audio_transcription.completed"
  ) {
    const text = strAt(raw, "transcript");
    return text === ""
      ? none()
      : some<AgentEvent>({
          kind: "WriterSaid",
          text,
        });
  }
  // GA renamed the assistant-transcript event to
  // `response.output_audio_transcript.done` (probed
  // live 2026-07-12); the pre-GA name is kept accepted
  // so a rollback upstream can't silence the page.
  if (
    type ===
      "response.output_audio_transcript.done" ||
    type === "response.audio_transcript.done"
  ) {
    const text = strAt(raw, "transcript");
    return text === ""
      ? none()
      : some<AgentEvent>({
          kind: "AssistantSaid",
          text,
        });
  }
  if (
    type ===
      "response.function_call_arguments.done" &&
    strAt(raw, "name") === "search_docs"
  ) {
    return some<AgentEvent>({
      kind: "ToolCalled",
      callId: strAt(raw, "call_id"),
      keywords: keywordsOf(
        strAt(raw, "arguments"),
      ),
    });
  }
  return none();
};
