import { Procedural, match } from "plgg";
import {
  Provider,
  openai,
  anthropic,
  google,
} from "plgg-foundry/index";
import { reqOpenAIObject } from "plgg-foundry/LLMs/vendor/OpenAI";
import { reqAnthropicObject } from "plgg-foundry/LLMs/vendor/Anthropic";

export const generateObject = ({
  provider,
  systemPrompt,
  userPrompt,
  schema,
}: {
  provider: Provider;
  systemPrompt?: string;
  userPrompt: string;
  schema: Record<string, unknown>;
}): Procedural<unknown, Error> =>
  match(
    provider,
    [
      openai(),
      () =>
        reqOpenAIObject({
          apiKey: provider.content.apiKey,
          model: provider.content.modelName,
          instructions: systemPrompt || "",
          input: userPrompt,
          schema,
        }),
    ],
    [
      anthropic(),
      () =>
        reqAnthropicObject({
          apiKey: provider.content.apiKey,
          model: provider.content.modelName,
          instructions: systemPrompt || "",
          input: userPrompt,
          schema,
        }),
    ],
    [google(), () => {}],
  );
