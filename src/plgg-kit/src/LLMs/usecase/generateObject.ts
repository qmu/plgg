import {
  PromisedResult,
  Datum,
  match,
  unbox,
} from 'plgg';
import {
  Provider,
  openAI$,
  anthropic$,
  google$,
} from 'plgg-kit/LLMs/model';
import { reqObjectGPT } from 'plgg-kit/LLMs/vendor/OpenAI';
import { reqObjectClaude } from 'plgg-kit/LLMs/vendor/Anthropic';
import { reqObjectGemini } from 'plgg-kit/LLMs/vendor/Google';

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
      openAI$(),
      () =>
        reqObjectGPT({
          apiKey: unbox(provider).apiKey,
          model: unbox(provider).modelName,
          instructions: systemPrompt || '',
          input: userPrompt,
          schema,
        }),
    ],
    [
      anthropic$(),
      () =>
        reqObjectClaude({
          apiKey: unbox(provider).apiKey,
          model: unbox(provider).modelName,
          instructions: systemPrompt || '',
          input: userPrompt,
          schema,
        }),
    ],
    [
      google$(),
      () =>
        reqObjectGemini({
          apiKey: unbox(provider).apiKey,
          model: unbox(provider).modelName,
          instructions: systemPrompt || '',
          input: userPrompt,
          schema,
        }),
    ]
  );
