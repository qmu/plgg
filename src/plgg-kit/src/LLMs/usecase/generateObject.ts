import {
  PromisedResult,
  Datum,
  proc,
  match,
  unbox,
  isSome,
  ok,
  env,
} from "plgg";
import {
  Provider,
  openAI$,
  anthropic$,
  google$,
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
  proc(
    provider.content,
    unbox,
    ({ apiKey }) =>
      isSome(apiKey)
        ? ok(apiKey.content)
        : match(
            provider,
            [
              openAI$(),
              () => env("OPENAI_API_KEY"),
            ],
            [
              anthropic$(),
              () => env("ANTHROPIC_API_KEY"),
            ],
            [
              google$(),
              () => env("GOOGLE_API_KEY"),
            ],
          ),
    (apiKey) =>
      match(
        provider,
        [
          openAI$(),
          () =>
            reqObjectGPT({
              apiKey,
              model: unbox(provider).modelName,
              instructions: systemPrompt || "",
              input: userPrompt,
              schema,
            }),
        ],
        [
          anthropic$(),
          () =>
            reqObjectClaude({
              apiKey,
              model: unbox(provider).modelName,
              instructions: systemPrompt || "",
              input: userPrompt,
              schema,
            }),
        ],
        [
          google$(),
          () =>
            reqObjectGemini({
              apiKey,
              model: unbox(provider).modelName,
              instructions: systemPrompt || "",
              input: userPrompt,
              schema,
            }),
        ],
      ),
  );
