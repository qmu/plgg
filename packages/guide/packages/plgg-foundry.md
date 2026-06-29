# plgg-foundry

::: warning Most experimental package
plgg-foundry is early study work — APIs may change, some
tests are skipped, and every run calls an LLM. Calibrate
expectations accordingly; the value here is the *model*,
not production stability.
:::

**AI-powered workflow orchestration**, built on
[plgg](/packages/plgg/) and
[plgg-kit](/packages/plgg-kit). You define a set of
operations (a **Foundry**); an LLM composes them into an
execution plan (an **Alignment**) from a natural-language
request, and a register machine runs it.

::: tip Full API reference
For every export with its signature, see the
**[plgg-foundry API reference](/api/plgg-foundry/)**.
:::

## The model

- **Foundry** — your "factory spec": the operations
  available for the AI to compose. Its **apparatuses**
  are:
  - **Processors** — transform data (`makeProcessor`).
  - **Switchers** — validate or branch, enabling
    retry/validation loops (`makeSwitcher`).
  - **Packers** — declare the expected outputs
    (`makePacker`).
- **Order** — the user request (`{ text, files? }`).
- **Alignment** — the AI-generated sequence of operations.
- **Medium** — the execution environment passed to your
  functions: `{ alignment, params }`, where `params` are
  the numbered registers (`r0`, `r1`, …).

Internally, `runFoundry` is a `proc` chain:
`blueprint(foundry)` asks the LLM for an `Alignment`, then
`operate(foundry)(order)` runs it on the register machine
— so the whole flow is errors-as-values, not exceptions.

## Defining and running a foundry

The current API is `makeFoundry` / `makeProcessor` /
`makeSwitcher` / `makePacker`, run with
`runFoundry(foundry)(input)` where `input` is a prompt
string or an `OrderSpec`:

```typescript
import { makeFoundry, makeProcessor, runFoundry } from "plgg-foundry";
import { proc, matchResult } from "plgg";

const profileFoundry = makeFoundry({
  description: "Greets users based on their profile.",
  apparatuses: [
    makeProcessor({
      name: "greet",
      description: "Generates a personalized greeting.",
      arguments: {
        profile: { type: '{ "name": string, "interests": string[] }' },
      },
      fn: ({ params }) =>
        proc(
          params["profile"],
          asProfile, // a cast-based decoder → InvalidError on bad shape
          (p) => ({
            greeting: `Hello ${p.name}! You like: ${p.interests.join(", ")}.`,
          }),
        ),
    }),
  ],
});

const result = await runFoundry(profileFoundry)(
  "Greet a user named Ada who likes math and engines",
);
matchResult(
  (e) => console.error("failed", e),
  (medium) => console.log(medium.params),
)(result);
```

A `makeFoundry` spec accepts `description`, `apparatuses`,
an optional `provider` (defaults to `openai("gpt-5.1")`),
and `maxOperationLimit` (default 10, a loop guard).
Operation `fn`s return data — decode untrusted register
values with a `cast`-based guard so a bad shape becomes an
`InvalidError` rather than a throw, consistent with the
[core error model](/packages/plgg/structures-errors#the-error-model-—-errors-as-data).

## The LLM provider boundary

The model is **vendor-neutral**: the adapter is the point.
A `provider` comes from [plgg-kit](/packages/plgg-kit) —
`openai(model)`, `anthropic(model)`, or `google(model)`
(each also accepts `{ model, apiKey? }`) — so switching
LLM vendors is a one-line change to the foundry's
`provider`, not a rewrite of the operations.
