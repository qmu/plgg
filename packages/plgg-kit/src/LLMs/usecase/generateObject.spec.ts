import {
  test,
  check,
  toContain,
  okThen,
  vi,
} from "plgg-test";
import {
  proc,
  atProp,
  asReadonlyArray,
  asSoftStr,
  ok,
  Datum,
  Dict,
  Str,
} from "plgg";
import {
  openai,
  anthropic,
  google,
} from "plgg-kit/index";
import { generateObject } from "plgg-kit/LLMs/usecase/generateObject";

// Offline tests inject a typed fake for plgg's `postJson` (the single
// network seam) through `generateObject`'s `post` parameter, so the full
// path — provider dispatch, apiKey resolution, request assembly, and the
// per-vendor response decode — runs without hitting any LLM API. The
// canned response is shaped per vendor envelope (keyed off the request
// URL). The fake satisfies `typeof postJson` exactly: `({ url, headers })
// => (data) => Promise<Result<unknown, Error>>` — no cast.
const FRUITS =
  '{"fruits":["pineapple","mango","kiwi"]}';

const responseFor = (url: string): unknown =>
  url.includes("openai")
    ? {
        output: [{ content: [{ text: FRUITS }] }],
      }
    : url.includes("anthropic")
      ? { content: [{ text: FRUITS }] }
      : {
          candidates: [
            {
              content: {
                parts: [{ text: FRUITS }],
              },
            },
          ],
        };

const fakePost =
  ({ url }: { url: Str; headers: Dict }) =>
  (_data: Datum) =>
    Promise.resolve(
      ok(responseFor(url.content)),
    );

const testSchema = {
  type: "object",
  properties: {
    fruits: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "strawberry",
          "pineapple",
          "banana",
          "mango",
          "kiwi",
        ],
      },
    },
  },
  required: ["fruits"],
  additionalProperties: false,
};

// --- offline: full path with an injected network seam, apiKey from the provider ---

test("generateObject (OpenAI) assembles the request and decodes the response offline", async () =>
  check(
    await proc(
      {
        provider: openai({
          model: "gpt-5.1",
          apiKey: "sk-test",
        }),
        systemPrompt: "You are a cake maker.",
        userPrompt: "Choose 3 fruits.",
        schema: testSchema,
        post: fakePost,
      },
      generateObject,
      atProp("fruits"),
      asReadonlyArray(asSoftStr),
    ),
    okThen((fruits) =>
      toContain("pineapple")(fruits),
    ),
  ));

test("generateObject (Anthropic) decodes the content[0].text envelope offline", async () =>
  check(
    await proc(
      {
        provider: anthropic({
          model: "claude-sonnet-4-5",
          apiKey: "sk-test",
        }),
        userPrompt: "Choose 3 fruits.",
        schema: testSchema,
        post: fakePost,
      },
      generateObject,
      atProp("fruits"),
      asReadonlyArray(asSoftStr),
    ),
    okThen((fruits) =>
      toContain("mango")(fruits),
    ),
  ));

test("generateObject (Google) decodes the candidates[0].content.parts[0].text envelope offline", async () =>
  check(
    await proc(
      {
        provider: google({
          model: "gemini-2.5-flash",
          apiKey: "sk-test",
        }),
        userPrompt: "Choose 3 fruits.",
        schema: testSchema,
        post: fakePost,
      },
      generateObject,
      atProp("fruits"),
      asReadonlyArray(asSoftStr),
    ),
    okThen((fruits) => toContain("kiwi")(fruits)),
  ));

test("generateObject resolves the apiKey from env when the provider carries none", async () => {
  vi.stubEnv("OPENAI_API_KEY", "sk-from-env");
  try {
    return check(
      await proc(
        {
          provider: openai("gpt-5.1"),
          userPrompt: "Choose 3 fruits.",
          schema: testSchema,
          post: fakePost,
        },
        generateObject,
        atProp("fruits"),
        asReadonlyArray(asSoftStr),
      ),
      okThen((fruits) =>
        toContain("pineapple")(fruits),
      ),
    );
  } finally {
    vi.unstubAllEnvs();
  }
});

// --- live integration (skipped by default; require real API keys) ---

test.skip("generateObject with OpenAI provider works", async () => {
  const result = await proc(
    {
      provider: openai({
        model: "gpt-5.1",
      }),
      systemPrompt:
        "You are an expert cake maker.",
      userPrompt:
        "Choose 3 fruits for a pineapple cake.",
      schema: testSchema,
    },
    generateObject,
    atProp("fruits"),
    asReadonlyArray(asSoftStr),
  );
  return check(
    result,
    okThen((fruits) =>
      toContain("pineapple")(fruits),
    ),
  );
});

test.skip("generateObject with Anthropic provider works", async () => {
  const result = await proc(
    {
      provider: anthropic({
        model: "claude-sonnet-4-5",
      }),
      systemPrompt:
        "You are an expert cake maker.",
      userPrompt:
        "Choose 3 fruits for a pineapple cake.",
      schema: testSchema,
    },
    generateObject,
    atProp("fruits"),
    asReadonlyArray(asSoftStr),
  );
  return check(
    result,
    okThen((fruits) =>
      toContain("pineapple")(fruits),
    ),
  );
});

test.skip("generateObject with Google provider works", async () => {
  const result = await proc(
    {
      provider: google({
        model: "gemini-2.5-flash",
      }),
      systemPrompt:
        "You are an expert cake maker.",
      userPrompt:
        "Choose 3 fruits for a pineapple cake.",
      schema: testSchema,
    },
    generateObject,
    atProp("fruits"),
    asReadonlyArray(asSoftStr),
  );
  return check(
    result,
    okThen((fruits) =>
      toContain("pineapple")(fruits),
    ),
  );
});
