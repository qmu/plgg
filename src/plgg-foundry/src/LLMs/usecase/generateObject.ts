import { Procedural, match } from "plgg";
import {
  Provider,
  openai,
  anthropic,
  google,
} from "plgg-foundry/index";
import { reqObjectGPT } from "plgg-foundry/LLMs/vendor/OpenAI";
import { reqObjectClaude } from "plgg-foundry/LLMs/vendor/Anthropic";
import { reqObjectGemini } from "plgg-foundry/LLMs/vendor/Google";

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
        reqObjectGPT({
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
        reqObjectClaude({
          apiKey: provider.content.apiKey,
          model: provider.content.modelName,
          instructions: systemPrompt || "",
          input: userPrompt,
          schema,
        }),
    ],
    [
      google(),
      () =>
        reqObjectGemini({
          apiKey: provider.content.apiKey,
          model: provider.content.modelName,
          instructions: systemPrompt || "",
          input: userPrompt,
          schema,
        }),
    ],
  );
