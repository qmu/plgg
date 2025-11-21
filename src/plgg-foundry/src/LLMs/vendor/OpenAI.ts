import {
  Procedural,
  proc,
  atProp,
  atIndex,
  asSoftStr,
  jsonDecode,
  postJson,
} from "plgg";

export const reqOpenAIObject = ({
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
}): Procedural<unknown, Error> =>
  proc(
    {
      model,
      input,
      reasoning: {
        effort: "minimal",
      },
      instructions,
      text: { format: schema },
    },
    postJson({
      url: "https://api.openai.com/v1/responses",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }),
    atProp("output"),
    atIndex(1),
    atProp("content"),
    atIndex(0),
    atProp("text"),
    asSoftStr,
    jsonDecode,
  );
