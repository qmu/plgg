/**
 * The server-side answer engine: retrieved chunks in,
 * grounded + cited answer out, via plgg-kit's
 * `generateObject` (OpenAI Responses API structured
 * output — one completion, NOT a tool-calling loop). The
 * standing key never appears here: `generateObject`
 * resolves it from the provider `Option` or the server's
 * env (`OPENAI_API_KEY`), and this module only ever runs
 * in the node entrypoint — no browser file imports it.
 * The network seam (`post`) is injectable so the smoke
 * suite exercises the full path offline.
 */
import {
  type PromisedResult,
  type SoftStr,
  type Result,
  type InvalidError,
  ok,
  pipe,
  proc,
  cast,
  asObj,
  forProp,
  asSoftStr,
  asNum,
  asReadonlyArray,
  fromNullable,
  matchOption,
  mapErr,
  postJson,
} from "plgg";
import { openai, generateObject } from "plgg-kit";
import {
  type SourceChunk,
  type GroundedAnswer,
} from "./protocol.ts";

export const ANSWER_MODEL = "gpt-5.1";

const SYSTEM = [
  "You answer a reader's question about the provided documentation.",
  "Answer in the language of the question.",
  "Use ONLY the numbered sources provided — no outside knowledge.",
  "Cite every claim by listing the source numbers you actually used in `citations`.",
  "If the sources do not contain the answer, say so plainly in `answer` and return an empty `citations` array.",
  "Keep the answer to a few sentences, written for a developer reading the guide.",
].join(" ");

/** The structured shape the model must return. */
export const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description:
        "The grounded answer, a few sentences.",
    },
    citations: {
      type: "array",
      items: { type: "integer" },
      description:
        "The 1-based source numbers the answer used; empty when the sources do not contain the answer.",
    },
  },
  required: ["answer", "citations"],
  additionalProperties: false,
};

const sourcesBlock = (
  chunks: ReadonlyArray<SourceChunk>,
): SoftStr =>
  chunks
    .map(
      (chunk, i) =>
        `[${i + 1}] ${chunk.headingPath}\n${chunk.text}`,
    )
    .join("\n\n");

export const promptOf = (
  question: SoftStr,
  chunks: ReadonlyArray<SourceChunk>,
): SoftStr =>
  `Sources:\n\n${sourcesBlock(chunks)}\n\nQuestion: ${question}`;

/**
 * The model cites 1-based SOURCE NUMBERS (what it can see
 * in the prompt); the wire answer carries CHUNK IDS (what
 * the browser can link). Map across, dropping numbers
 * outside the provided range (a hallucinated source must
 * not become a citation) and collapsing duplicates.
 */
const citedIds = (
  chunks: ReadonlyArray<SourceChunk>,
  numbers: ReadonlyArray<number>,
): ReadonlyArray<number> => [
  ...new Set(
    numbers.flatMap((n) =>
      pipe(
        fromNullable(chunks[n - 1]),
        matchOption(
          (): ReadonlyArray<number> => [],
          (
            chunk: SourceChunk,
          ): ReadonlyArray<number> => [chunk.id],
        ),
      ),
    ),
  ),
];

const decodeRaw = (
  raw: unknown,
): Result<
  {
    answer: SoftStr;
    citations: ReadonlyArray<number>;
  },
  InvalidError
> =>
  cast(
    raw,
    asObj,
    forProp("answer", asSoftStr),
    forProp("citations", asReadonlyArray(asNum)),
  );

/**
 * The proc chain's error channel carries whatever the
 * vendor/decode layers err with (unknown); fold it onto
 * `Error` once, at this module's edge, so the serve
 * entry has one honest message to answer 502 with.
 */
const toError = (e: unknown): Error =>
  e instanceof Error
    ? e
    : new Error(
        typeof e === "string"
          ? e
          : JSON.stringify(e),
      );

/**
 * Ask the model for a grounded answer over the retrieved
 * chunks. Key resolution (provider Option → server env)
 * and vendor dispatch live entirely in plgg-kit.
 */
export const generateAnswer = ({
  question,
  chunks,
  post = postJson,
}: {
  question: SoftStr;
  chunks: ReadonlyArray<SourceChunk>;
  post?: typeof postJson;
}): PromisedResult<GroundedAnswer, Error> =>
  proc(
    {
      provider: openai(ANSWER_MODEL),
      systemPrompt: SYSTEM,
      userPrompt: promptOf(question, chunks),
      schema: ANSWER_SCHEMA,
      post,
    },
    generateObject,
    decodeRaw,
    (r): Result<GroundedAnswer, Error> =>
      ok({
        answer: r.answer,
        citations: citedIds(chunks, r.citations),
      }),
  ).then(mapErr(toError));
