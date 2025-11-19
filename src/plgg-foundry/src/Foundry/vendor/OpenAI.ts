import {
  Result,
  proc,
  atProp,
  atIndex,
  asSoftStr,
  jsonDecode,
  postJson,
} from "plgg";

export const generateJson = async ({
  apiKey,
  model,
  instructions,
  input,
  responseFormat,
}: {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  responseFormat: any;
}): Promise<Result<unknown, Error>> =>
  proc(
    {
      model,
      input,
      reasoning: {
        effort: "minimal",
      },
      instructions,
      text: { format: responseFormat },
    },
    postJson({
      url: "https://api.openai.com/v1/responses",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }),
    async (res) => await res.json(),
    atProp("output"),
    atIndex(1),
    atProp("content"),
    atIndex(0),
    atProp("text"),
    asSoftStr,
    jsonDecode,
  );
