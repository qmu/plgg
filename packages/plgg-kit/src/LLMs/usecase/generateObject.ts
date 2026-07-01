import {
  PromisedResult,
  Datum,
  box,
  proc,
  match,
  unbox,
  isSome,
  ok,
  env,
  pipe,
  fromNullable,
  getOr,
  postJson,
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
  // The network seam, threaded down to the vendor request builders.
  // Injectable for offline tests; defaults to the real `postJson`, so
  // production behavior is unchanged. Typed as `typeof postJson`.
  post = postJson,
}: {
  provider: Provider;
  systemPrompt?: string;
  userPrompt: string;
  schema: Datum;
  post?: typeof postJson;
}): PromisedResult<unknown, unknown> => {
  // Bind once: model is the same regardless of branch; instructions default to
  // "" via Option (not `|| ""`).
  const model = unbox(provider).model;
  const instructions = pipe(
    fromNullable(systemPrompt),
    getOr(""),
  );
  return proc(
    provider.content,
    unbox,
    ({ apiKey }) =>
      isSome(apiKey)
        ? ok(apiKey.content)
        : match(provider)(
            [
              openAI$(),
              () =>
                env(box("Str")("OPENAI_API_KEY")),
            ],
            [
              anthropic$(),
              () =>
                env(
                  box("Str")("ANTHROPIC_API_KEY"),
                ),
            ],
            [
              google$(),
              () =>
                env(box("Str")("GEMINI_API_KEY")),
            ],
          ),
    (apiKey) =>
      match(provider)(
        [
          openAI$(),
          () =>
            reqObjectGPT({
              apiKey,
              model,
              instructions,
              input: userPrompt,
              schema,
              post,
            }),
        ],
        [
          anthropic$(),
          () =>
            reqObjectClaude({
              apiKey,
              model,
              instructions,
              input: userPrompt,
              schema,
              post,
            }),
        ],
        [
          google$(),
          () =>
            reqObjectGemini({
              apiKey,
              model,
              instructions,
              input: userPrompt,
              schema,
              post,
            }),
        ],
      ),
  );
};
