import { PromisedResult, match, Datum } from "plgg";
import {
  Provider,
  patternOpenAI,
  patternAnthropic,
  patternGoogle,
} from "plgg-kit/LLMs/model";
import { reqObjectGPT } from "plgg-kit/LLMs/vendor/OpenAI";
import { reqObjectClaude } from "plgg-kit/LLMs/vendor/Anthropic";
import { reqObjectGemini } from "plgg-kit/LLMs/vendor/Google";

export const generateObject = ({
  provider,
  systemPrompt,
  userPrompt,
  schema,
}: {
  provider: Provider;
  systemPrompt?: string;
  userPrompt: string;
  schema: Datum;
}): PromisedResult<unknown, Error> =>
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
