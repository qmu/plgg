# plgg-kit

`plgg-kit` is the family's **vendored dependency surface**
— the LLM provider abstractions a plgg project (notably
[plgg-foundry](/packages/plgg-foundry)) builds on. It is
not an API to learn in depth; it is the seam where
external AI vendors enter the plgg world as plain data.

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
