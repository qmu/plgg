# Choosing an approach for a bookshelf

## Validating a registration form

Zod validates against a schema. Its safeParse result provides typed data or issues with field paths. Valibot also builds a schema as a value and passes it alongside the input to safeParse to obtain output or issues. Either fits a form that reports field errors to an existing application. A plgg cast runs casters in order and stops on failure. Choose it when the validated title continues through storage and display using the same Result conventions.

[Zod](https://zod.dev/basics) · [Valibot](https://valibot.dev/guides/parse-data/)

## When should a save start?

In fp-ts a TaskEither is a deferred asynchronous computation producing Left or Right. It fits code that assembles computations and chooses when to invoke them. Calling plgg’s proc starts a Promise-based chain. A handler already returning promises and results can use it without a separate execution step.

[fp-ts TaskEither](https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html)

Effect types describe success, failure and required services. That third dimension matters when a program supplies a database or clock before running a computation with the runtime. In the plgg bookshelf, the connection can travel as a function argument. This is easy to trace in a small operation and requires more wiring as dependencies grow.

[Effect](https://effect.website/docs/getting-started/the-effect-type/)

## When one failure ends the program

For a short import script that exits on either an unreadable file or malformed JSON, plain TypeScript and a top-level try/catch express the entire policy. A screen that sends invalid titles back to the form and retries failed saves benefits from carrying those reasons in Result. Mixing the two models requires a conversion where they meet.
