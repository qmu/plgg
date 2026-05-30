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

// https://platform.claude.com/docs/en/api/messages/create

export const reqObjectClaude = ({
  apiKey,
  model,
  instructions,
  input,
  schema,
  maxTokens = 1024,
}: {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  schema: Datum;
  maxTokens?: number;
}): PromisedResult<unknown, Error> =>
  proc(
    {
      model,
      max_tokens: maxTokens,
      system: instructions,
      messages: [
        { role: "user", content: input },
      ],
      output_format: {
        type: "json_schema",
        schema,
      },
    },
    postJson({
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":
          "structured-outputs-2025-11-13",
      },
    }),
    atProp("content"),
    atIndex(0),
    atProp("text"),
    asSoftStr,
    jsonDecode,
  );
