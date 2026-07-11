import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  vi,
} from "plgg-test";
import {
  type Datum,
  type Dict,
  ok,
  isErr,
} from "plgg";
import {
  generateAnswer,
  promptOf,
} from "./answer.ts";
import { type SourceChunk } from "./protocol.ts";

// The offline smoke bar: the FULL answer path — prompt
// assembly, plgg-kit's provider dispatch + Responses API
// envelope decode, this PoC's citation mapping — runs
// with a typed fake for plgg's `postJson` (the single
// network seam), exactly the seam plgg-kit's own specs
// inject. No network in tests.
const CHUNKS: ReadonlyArray<SourceChunk> = [
  {
    id: 10,
    file: "concepts/result.md",
    headingPath: "concepts/result.md > Result",
    text: "handle errors with Result, never throw",
  },
  {
    id: 20,
    file: "concepts/option.md",
    headingPath: "concepts/option.md > Option",
    text: "absence is Option, not null",
  },
];

/** An OpenAI Responses envelope carrying `body`. */
const fakePost =
  (body: string) =>
  (_req: { url: string; headers: Dict }) =>
  (_data: Datum) =>
    Promise.resolve(
      ok({
        output: [{ content: [{ text: body }] }],
      }),
    );

const withKey = async <T>(
  run: () => Promise<T>,
): Promise<T> => {
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
  try {
    return await run();
  } finally {
    vi.unstubAllEnvs();
  }
};

test("generateAnswer maps 1-based source numbers to chunk ids, deduped, hallucinated numbers dropped", () =>
  withKey(async () =>
    check(
      await generateAnswer({
        question: "How do I handle errors?",
        chunks: CHUNKS,
        post: fakePost(
          JSON.stringify({
            answer:
              "Use Result; absence is Option.",
            citations: [2, 1, 2, 99],
          }),
        ),
      }),
      okThen((a) =>
        toEqual({
          answer:
            "Use Result; absence is Option.",
          citations: [20, 10],
        })(a),
      ),
    ),
  ));

test("generateAnswer passes the honest empty-citations state through", () =>
  withKey(async () =>
    check(
      await generateAnswer({
        question: "What is the moon made of?",
        chunks: CHUNKS,
        post: fakePost(
          JSON.stringify({
            answer:
              "The sources do not contain this.",
            citations: [],
          }),
        ),
      }),
      okThen((a) => toEqual([])(a.citations)),
    ),
  ));

test("generateAnswer rejects a model reply missing the contract", () =>
  withKey(async () =>
    check(
      isErr(
        await generateAnswer({
          question: "How do I handle errors?",
          chunks: CHUNKS,
          post: fakePost(
            JSON.stringify({
              answer: "shapeless",
            }),
          ),
        }),
      ),
      toBe(true),
    ),
  ));

test("promptOf numbers the sources and closes with the question", () => {
  const prompt = promptOf(
    "How do I handle errors?",
    CHUNKS,
  );
  return all([
    check(
      prompt.includes(
        "[1] concepts/result.md > Result",
      ),
      toBe(true),
    ),
    check(
      prompt.includes(
        "[2] concepts/option.md > Option",
      ),
      toBe(true),
    ),
    check(
      prompt.endsWith(
        "Question: How do I handle errors?",
      ),
      toBe(true),
    ),
  ]);
});
