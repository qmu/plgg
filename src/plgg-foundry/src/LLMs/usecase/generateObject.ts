import { Result, match } from "plgg";
import {
  Provider,
  patternOpenAI,
  patternAnthropic,
  patternGoogle,
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
}): Promise<Result<unknown, Error>> =>
  match(
    provider,
    [
      patternOpenAI(),
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
      patternAnthropic(),
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
      patternGoogle(),
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
