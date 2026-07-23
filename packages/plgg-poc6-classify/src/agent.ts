/**
 * PoC 6's assistant loop that is NOT a browser API — the
 * Realtime event decoder (decoding the THREE variant-query
 * tools into typed {@link VariantQuery}s) and the session
 * instructions. All total functions over plain data,
 * unit-tested offline; WebRTC lives in `vendors/`. The
 * voice path is a BONUS — the deterministic command parser
 * (command.ts) drives the same queries without a model.
 */
import {
  type SoftStr,
  type Option,
  type InvalidError,
  some,
  none,
  pipe,
  tryCatch,
  invalidError,
  matchResult,
  matchOption,
} from "plgg";
import {
  type VariantQuery,
  type TagMode,
  asTagMode,
} from "./variants.ts";
import { type Page } from "./classify.ts";

/** The pinned Realtime snapshot (carried from PoC 3/4/4b/5). */
export const REALTIME_MODEL = "gpt-realtime-2.1";

/** One transcript line of the conversation. */
export type Line = Readonly<{
  who: "writer" | "assistant";
  text: SoftStr;
}>;

/**
 * One query as the page shows it — which variant it drove
 * and what became of it. A parse failure (from the typed
 * box) is a refusal; a parsed query always runs (possibly
 * to zero results).
 */
export type QueryTrail = Readonly<{
  summary: SoftStr;
  outcome:
    | Readonly<{ kind: "ran"; count: number }>
    | Readonly<{
        kind: "refused";
        reason: SoftStr;
      }>;
}>;

/* ------------------------------------------------ *
 * Session instructions                              *
 * ------------------------------------------------ */

export const TAG_BUDGET = 40;
export const PAGE_BUDGET = 40;

/**
 * The session instructions: who the assistant is, how it
 * drives the three navigation variants (call the tools),
 * and the corpus's tags + a sample of its pages so it
 * queries real values.
 */
export const instructionsOf = (
  pages: ReadonlyArray<Page>,
): SoftStr => {
  const tags = [
    ...new Set(pages.flatMap((p) => p.tags)),
  ]
    .sort()
    .slice(0, TAG_BUDGET);
  const sample = pages
    .slice(0, PAGE_BUDGET)
    .map((p) => p.path);
  return [
    "You are the reader-side navigation assistant embedded in a documentation site; the reader talks to you by voice or typed text.",
    "The corpus is classified NON-hierarchically: each page has several tags (its directory segments plus any front-matter tags) and links to other pages. You navigate it three ways, by calling tools:",
    "query_facets(mode, tags): pages matching a set of tags combined with `and` or `or`. query_links(focus): the pages linking to/from a focus page. query_filter(text, tags): pages whose path contains `text` and that carry all the given tags.",
    "Only use tags and page paths that exist in the corpus. After a query, tell the reader how many pages matched and name a few.",
    `Corpus tags: ${tags.join(", ") || "(none)"}.`,
    `Sample pages: ${sample.join(", ") || "(none)"}.`,
  ].join("\n\n");
};

/* ------------------------------------------------ *
 * The three query tools                             *
 * ------------------------------------------------ */

export const QUERY_FACETS_TOOL = {
  type: "function",
  name: "query_facets",
  description:
    "Find pages by a set of tags. `mode` is `and` (all tags) or `or` (any tag). `tags` is a list of tag names.",
  parameters: {
    type: "object",
    properties: {
      mode: { type: "string" },
      tags: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["mode", "tags"],
    additionalProperties: false,
  },
};

export const QUERY_LINKS_TOOL = {
  type: "function",
  name: "query_links",
  description:
    "Find the neighbors of a focus page — the pages it links to and the pages that link back to it. `focus` is a corpus-relative page path.",
  parameters: {
    type: "object",
    properties: { focus: { type: "string" } },
    required: ["focus"],
    additionalProperties: false,
  },
};

export const QUERY_FILTER_TOOL = {
  type: "function",
  name: "query_filter",
  description:
    "Find pages whose path contains `text` AND that carry all of `tags` (either may be empty).",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string" },
      tags: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["text", "tags"],
    additionalProperties: false,
  },
};

export const QUERY_TOOLS: ReadonlyArray<unknown> = [
  QUERY_FACETS_TOOL,
  QUERY_LINKS_TOOL,
  QUERY_FILTER_TOOL,
];

/** A one-line human summary of a variant query. */
export const summarizeQuery = (
  vq: VariantQuery,
): SoftStr => {
  switch (vq.kind) {
    case "tag-facets":
      return `facets ${vq.query.mode} ${vq.query.tags.join(" ")}`.trim();
    case "link-graph":
      return `links ${vq.query.focus}`;
    case "multi-filter":
      return `filter ${[
        vq.query.text,
        ...vq.query.tags.map((t) => `#${t}`),
      ]
        .filter((s) => s !== "")
        .join(" ")}`.trim();
  }
};

/* ------------------------------------------------ *
 * Realtime event decoding (data channel → domain)   *
 * ------------------------------------------------ */

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
      kind: "QueryCalled";
      callId: SoftStr;
      query: VariantQuery;
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

const strArrAt = (
  v: unknown,
  key: string,
): ReadonlyArray<SoftStr> => {
  const raw = objAt(v, key);
  return Array.isArray(raw)
    ? raw.filter(
        (x): x is string => typeof x === "string",
      )
    : [];
};

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

/** A query-tool call's args → its VariantQuery. */
const queryOf = (
  name: SoftStr,
  args: unknown,
): Option<VariantQuery> => {
  switch (name) {
    case "query_facets": {
      const mode: TagMode = pipe(
        asTagMode(strAt(args, "mode")),
        matchOption(
          (): TagMode => "and",
          (m: TagMode): TagMode => m,
        ),
      );
      return some<VariantQuery>({
        kind: "tag-facets",
        query: {
          tags: strArrAt(args, "tags"),
          mode,
        },
      });
    }
    case "query_links":
      return some<VariantQuery>({
        kind: "link-graph",
        query: { focus: strAt(args, "focus") },
      });
    case "query_filter":
      return some<VariantQuery>({
        kind: "multi-filter",
        query: {
          text: strAt(args, "text"),
          tags: strArrAt(args, "tags"),
        },
      });
    default:
      return none();
  }
};

/**
 * Decode one Realtime data-channel event into the ONE
 * domain event it means, if any. Total: unknown event
 * types are `none()`, never a throw.
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
    type === "response.function_call_arguments.done"
  ) {
    const callId = strAt(raw, "call_id");
    const args = argsOf(strAt(raw, "arguments"));
    return pipe(
      queryOf(strAt(raw, "name"), args),
      matchOption(
        (): Option<AgentEvent> => none(),
        (
          query: VariantQuery,
        ): Option<AgentEvent> =>
          some<AgentEvent>({
            kind: "QueryCalled",
            callId,
            query,
          }),
      ),
    );
  }
  return none();
};
