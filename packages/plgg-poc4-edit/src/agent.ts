/**
 * The pure heart of PoC 4: everything the edit-capable
 * assistant loop needs that is NOT a browser API — the
 * Realtime event decoder (generalized from PoC 3's
 * single-tool gate to `search_docs` | `edit_file`), the
 * search executor over the seeded corpus copy's index,
 * the session instructions, and the doc↔route mapping
 * the iframe uses. All total functions over plain data,
 * unit-tested offline; WebRTC lives in `vendors/` and
 * the file write lives behind the server's
 * `POST /api/edit` seam.
 */
import {
  type SoftStr,
  type Option,
  type InvalidError,
  some,
  none,
  pipe,
  isSome,
  tryCatch,
  invalidError,
  matchResult,
} from "plgg";
import {
  type FtsIndex,
  searchFts,
} from "./poc1.ts";

/**
 * The pinned Realtime snapshot — the single source both
 * the server mint and the browser SDP exchange derive
 * from. Pinned to 2.1 explicitly (developer directive
 * 2026-07-13): the `gpt-realtime` alias still resolves to
 * the older GA snapshot, and 2.1's stronger tool-calling
 * discipline is what `edit_file` leans on.
 */
export const REALTIME_MODEL = "gpt-realtime-2.1";

/** One transcript line of the conversation. */
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
  hits: ReadonlyArray<ToolHit>;
}>;

/**
 * One `edit_file` call as the page shows it — which file
 * the agent asked to write and what became of it. Every
 * state is designed: an error names what went wrong and
 * what to do (self-explanatory-ui policy).
 */
export type EditTrail = Readonly<{
  path: SoftStr;
  outcome:
    | Readonly<{ kind: "landed" }>
    | Readonly<{
        kind: "refused";
        reason: SoftStr;
      }>;
}>;

/**
 * What executing the search tool yields: the trail entry
 * for the page, and the JSON payload the model receives
 * as its function output.
 */
export type ToolResult = Readonly<{
  trail: ToolTrail;
  output: SoftStr;
}>;

export const SEARCH_RESULT_COUNT = 5;

/**
 * Execute one `search_docs` call — pure BM25 over the
 * corpus copy's index. An empty result tells the model,
 * in words, to try other keywords rather than give up.
 */
export const runSearchTool = (
  index: FtsIndex,
  keywords: SoftStr,
): ToolResult => {
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
            results: [],
            note: "no match — call search_docs again with different keywords in the guide's own (English) vocabulary",
          }
        : {
            results: chunks.map(({ chunk }) => ({
              file: chunk.file,
              headingPath: chunk.headingPath,
              text: chunk.text,
            })),
          },
    ),
  };
};

/* ------------------------------------------------ *
 * Documents (the "same page" inside the iframe)     *
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
 * The plggpress route a corpus file renders at, under
 * the shell's /docs/ proxy — the inverse the iframe
 * needs of plggpress's `candidateFiles` mapping:
 * `index.md` → the section root, `foo.md` → `/foo`.
 */
export const routeOf = (file: SoftStr): SoftStr =>
  pipe(
    file.endsWith("/index.md")
      ? file.slice(0, -"/index.md".length)
      : file === "index.md"
        ? ""
        : file.endsWith(".md")
          ? file.slice(0, -".md".length)
          : file,
    (path: SoftStr): SoftStr => `/docs/${path}`,
  );

/** Keep instructions bounded; the doc can be large. */
export const DOC_BUDGET = 6000;

/**
 * The session instructions: who the assistant is, HOW it
 * must ground itself (drive the search tool, vary the
 * keywords, cite heading paths), WHEN it may write (the
 * writer asks for a change to the open document; confirm
 * what changed afterwards), and the open document
 * itself.
 */
export const instructionsOf = (
  doc: Option<
    Readonly<{ file: SoftStr; text: SoftStr }>
  >,
): SoftStr =>
  [
    "You are the writer-side assistant embedded in a documentation site; the writer talks to you by voice or typed text.",
    "The writer is looking at the open document below; you are on the same page.",
    "Ground every factual claim by calling the search_docs tool before answering. The search is exact-term BM25 over the (English) guide corpus: if results miss, call the tool AGAIN with different keyword variations.",
    "When the writer asks you to change, fix, or rewrite something in the open document, call the edit_file tool with the document's content-relative path and the COMPLETE new markdown for the whole file — never a fragment. After the edit lands the page reloads by itself; confirm to the writer exactly what you changed. Never edit a file the writer did not ask about.",
    "When you answer, name the heading paths of the sources you used.",
    "Default to the language the open document is written in (this corpus is English). If the writer asks you to speak or reply in another language, switch to that language for the rest of the conversation. Your EDITS to the document always stay in the document's own language, whatever language you are speaking.",
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

/** The search tool, unchanged from PoC 3's contract. */
export const SEARCH_TOOL = {
  type: "function",
  name: "search_docs",
  description:
    "Full-text search (BM25, exact-term) over the site's documents. Call repeatedly with different keyword variations until the results match the topic.",
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

/** What the assistant loop can learn from one event. */
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
      kind: "SearchCalled";
      callId: SoftStr;
      keywords: SoftStr;
    }>
  | Readonly<{
      kind: "EditCalled";
      callId: SoftStr;
      path: SoftStr;
      content: SoftStr;
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

/** `arguments` is a JSON string; a bad one is `{}`. */
const argsOf = (raw: SoftStr): unknown =>
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
      (): unknown => ({}),
      (parsed: unknown): unknown => parsed,
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
    "response.function_call_arguments.done"
  ) {
    const name = strAt(raw, "name");
    const args = argsOf(strAt(raw, "arguments"));
    return name === "search_docs"
      ? some<AgentEvent>({
          kind: "SearchCalled",
          callId: strAt(raw, "call_id"),
          keywords: strAt(args, "keywords"),
        })
      : name === "edit_file"
        ? some<AgentEvent>({
            kind: "EditCalled",
            callId: strAt(raw, "call_id"),
            path: strAt(args, "path"),
            content: strAt(args, "content"),
          })
        : none();
  }
  return none();
};
