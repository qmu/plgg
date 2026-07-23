import {
  PromisedResult,
  proc,
  atProp,
  atIndex,
  asSoftStr,
  jsonDecode,
  postJson,
  Datum,
} from "plgg";

// https://ai.google.dev/api/generate-content?hl=ja#json-mode
// https://ai.google.dev/gemini-api/docs/structured-output?hl=ja&example=recipe

export const reqObjectGemini = ({
  apiKey,
  model,
  instructions,
  input,
  schema,
  // The network seam, injectable for offline tests (defaults to the real
  // `postJson`; typed as `typeof postJson` so a fake must match it).
  post = postJson,
}: {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  schema: Datum;
  post?: typeof postJson;
}): PromisedResult<unknown, unknown> =>
  proc(
    {
      system_instruction: {
        parts: [
          {
            text: instructions,
          },
        ],
      },
      contents: [
        {
          parts: [
            {
              text: input,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    },
    post({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      headers: {
        "x-goog-api-key": apiKey,
      },
    }),
    atProp("candidates"),
    atIndex(0),
    atProp("content"),
    atProp("parts"),
    atIndex(0),
    atProp("text"),
    asSoftStr,
    jsonDecode,
  );
