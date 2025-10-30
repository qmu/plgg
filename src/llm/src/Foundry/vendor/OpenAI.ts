import {
  Result,
  proc,
  atProp,
  atIndex,
  asSoftStr,
  jsonDecode,
  newErr,
} from "plgg";

export const generateJson = async ({
  apiKey,
  model,
  input,
  responseFormat,
}: {
  apiKey: string;
  model: string;
  input: string;
  responseFormat: any;
}): Promise<Result<unknown, Error>> => {
  const res = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
        reasoning: {
          effort: "minimal",
        },
        text: { format: responseFormat },
      }),
    },
  );

  if (!res.ok) {
    return newErr(
      new Error(
        `OpenAI API error! status: ${res.status}, body: ${await res.text()}`,
      ),
    );
  }

  return proc(
    await res.json(),
    atProp("output"),
    atIndex(1),
    atProp("content"),
    atIndex(0),
    atProp("text"),
    asSoftStr,
    jsonDecode,
  );
};
