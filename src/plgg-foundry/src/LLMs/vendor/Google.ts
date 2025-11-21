import {
  Result,
  proc,
  atProp,
  atIndex,
  asSoftStr,
  jsonDecode,
  postJson,
} from "plgg";

// https://ai.google.dev/api/generate-content?hl=ja#json-mode
// https://ai.google.dev/gemini-api/docs/structured-output?hl=ja&example=recipe

export const reqObjectGemini = ({
  apiKey,
  model,
  instructions,
  input,
  schema,
}: {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  schema: any;
}): Promise<Result<unknown, Error>> =>
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
    postJson({
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
