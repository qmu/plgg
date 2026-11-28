# plgg-kit — Request structured model output

Pass a provider, a `userPrompt`, and an output `schema` to `generateObject`. The provider value selects OpenAI, Anthropic, or Google. The success value is typed as `unknown`, so [validate it](/concepts/validation/) before using it in your application. Supply a `post` function to test with a fixed response.

## Working with the API

`generateObject({ provider, userPrompt, schema, post? })`

The schema describes the requested output to the provider. Decode the returned value with `asObj` and field casters before giving it a domain type. A provider without an explicit key uses its corresponding environment variable.

```ts
import { ok } from "plgg";
import { generateObject, openai } from "plgg-kit";

const result = await generateObject({
  provider: openai({
    model: "gpt-5.1",
    apiKey: "offline",
  }),
  userPrompt: "Give one title",
  schema: { type: "string" },
  post: () => async () =>
    ok({
      output: [
        { content: [{ text: '"Atlas"' }] },
      ],
    }),
});
console.log(result);
```

## Test the response path offline

The injected post returns the OpenAI output, content and text envelope. The normal decoder still parses the JSON inside text. Supplying just the final title would fail earlier because the replacement sits at the transport boundary, before provider decoding.
