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

// https://platform.openai.com/docs/api-reference/responses

export const reqObjectGPT = ({
  apiKey,
  model,
  instructions,
  input,
  schema,
  // The network seam, injectable for offline tests. Defaults to the
  // real `postJson`; a spec passes a typed fake to exercise the request
  // assembly + response decode without hitting the API. Typed as
  // `typeof postJson`, so any fake must satisfy the real signature.
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
      model,
      input,
      reasoning: {
        effort: "none",
      },
      instructions,
      text: {
        format: {
          name: "schema",
          type: "json_schema",
          schema,
        },
      },
    },
    post({
      url: "https://api.openai.com/v1/responses",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }),
    atProp("output"),
    atIndex(0),
    atProp("content"),
    atIndex(0),
    atProp("text"),
    asSoftStr,
    jsonDecode,
  );
