# plgg-kit

`plgg-kit` is the family's **vendored dependency surface**
— the LLM provider abstractions a plgg project (notably
[plgg-foundry](/packages/plgg-foundry)) builds on. It is
not an API to learn in depth; it is the seam where
external AI vendors enter the plgg world as plain data.

## Writing an app with it

A vendor becomes plain config, and one
[`proc`](/concepts/composition) asks it for a
schema-shaped object and decodes the reply — failures
stay in the [`Result`](/concepts/result), never thrown:

```typescript
import {
  proc,
  atProp,
  asReadonlyArray,
  asSoftStr,
} from "plgg";
import {
  openai,
  generateObject,
} from "plgg-kit";

// A JSON schema the reply must satisfy:
const schema = {
  type: "object",
  properties: {
    fruits: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["fruits"],
};

// A provider is config, not a live client:
const provider = openai("gpt-5.1");

// Ask, then decode into typed data:
const pickFruits = proc(
  {
    provider,
    systemPrompt: "You are a cake maker.",
    userPrompt: "Choose 3 fruits.",
    schema,
  },
  generateObject,
  atProp("fruits"),
  asReadonlyArray(asSoftStr),
); // PromisedResult<readonly SoftStr[], _>
```

Swap `openai` for `anthropic` or `google` and nothing
else changes: the call site names a provider value, never
a vendor SDK. The `apiKey` is optional — omit it and
`generateObject` resolves it from the environment.

## Vocabulary

Everything is pure plgg data, grouped by concern:

- **providers** — `openai`/`anthropic`/`google`
  constructors, each accepting a bare model string or a
  `{ model, apiKey? }` object, producing the
  `OpenAI`/`Anthropic`/`Google`
  [`Box`](/concepts/tagged-data) variants unified as
  `Provider`.
- **validate & fold** — every provider has its `as*`
  decoder (`asOpenAI`/`asAnthropic`/`asGoogle`) and `*$`
  matcher (`openAI$`/`anthropic$`/`google$`), so a
  provider is validated as a [`Result`](/concepts/result)
  and folded **by name** like any other plgg value.
- **usecase** — `generateObject` takes a `provider`,
  prompts, and a JSON `schema`, and returns a
  `PromisedResult` of the decoded object.

## LLM providers

A provider is a tagged [`Box`](/concepts/tagged-data)
carrying a model + optional API key — pure config, not a
live client:

| Constructor | Type |
|-------------|------|
| `openai(model)` / `openai({ model, apiKey? })` | `OpenAI = Box<"OpenAI", Config>` |
| `anthropic(model)` / `anthropic({ model, apiKey? })` | `Anthropic = Box<"Anthropic", Config>` |
| `google(model)` / `google({ model, apiKey? })` | `Google = Box<"Google", Config>` |

```typescript
import { openai, anthropic } from "plgg-kit";

const provider = openai("gpt-5.1");
const alt = anthropic({ model: "claude-opus-4-8", apiKey });
```

The optional `apiKey` is lifted to an
[`Option`](/concepts/option) (never an `undefined`
literal), and each provider has its `as*` decoder and
`*$` matcher, so a provider can be validated and folded
by name like any other plgg value.

## Why a project depends on it

Keeping the vendor abstractions in one package means the
rest of the family stays vendor-neutral: plgg-foundry
takes a `provider` value and never names a vendor SDK
directly, so swapping LLM backends is a one-line change.
This is the same boundary discipline the HTTP packages
apply to runtimes — external concerns confined to a single
seam.
