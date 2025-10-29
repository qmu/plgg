import {
  cast,
  asReadonlyArray,
  asStr,
  forProp,
  forOptionProp,
} from "plgg";

const asResponse = (v: object) =>
  cast(
    v,
    forProp(
      "output",
      asReadonlyArray((v: object) =>
        cast(
          v,
          forOptionProp(
            "content",
            asReadonlyArray((v: object) =>
              cast(v, forProp("text", asStr)),
            ),
          ),
        ),
      ),
    ),
  );

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
}): Promise<unknown> => {
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
    const errorBody = await res.text();
    throw new Error(
      `OpenAI API error! status: ${res.status}, body: ${errorBody}`,
    );
  }
  const r = await res.json();
  const parsed = asResponse(r);
  if (parsed.isErr()) {
    throw new Error(
      `Failed to parse OpenAI response: ${parsed.content.message}`,
    );
  }
  const contentInRes =
    parsed.content.output[1]?.content?.content;
  if (contentInRes === undefined) {
    throw new Error(
      `No content found in OpenAI response`,
    );
  }
  const actualContent =
    contentInRes[0]?.text.content;
  if (actualContent === undefined) {
    throw new Error(
      `No text content found in OpenAI response`,
    );
  }
  return JSON.parse(actualContent);
};
