import {
  Result,
  proc,
  //atProp,
  //atIndex,
  //asSoftStr,
  //jsonDecode,
  postJson,
} from "plgg";

export const generateJsonClaude = async ({
  apiKey,
  model,
  instructions,
  input,
  responseFormat,
  maxTokens = 1024,
}: {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  responseFormat: any;
  maxTokens?: number;
}): Promise<Result<unknown, Error>> =>
  proc(
    {
      model,
      max_tokens: maxTokens,
      system: instructions,
      messages: [
        { role: "user", content: input },
      ],
      output_format: responseFormat,
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
  );
