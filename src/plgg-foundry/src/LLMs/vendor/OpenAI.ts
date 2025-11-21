import {
  PromisedResult,
  proc,
  atProp,
  atIndex,
  asSoftStr,
  jsonDecode,
  postJson,
} from "plgg";

// https://platform.openai.com/docs/api-reference/responses

export const reqObjectGPT = ({
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
}): PromisedResult<unknown, Error> =>
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
    postJson({
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
