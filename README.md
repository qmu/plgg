# plgg

> **UNSTABLE** - This is experimental study work focused on functional programming concepts. Primarily intended for our own projects, though publicly available.

A functional programming toolkit for TypeScript with type-safe pipelines, Result/Option monads, and AI workflow orchestration.

## Web development as one pipeline

`POST /articles`: validate the draft, stamp it with an id + timestamp, INSERT inside a transaction, return the saved row. One `proc` chain. The client posts the same draft, decodes the saved row, and folds the outcome with `match`.

```typescript
// server.ts — draft → stamped → tx{insert; read-back} → 201, in one expression.
import { pipe, proc, mapErr, decodeJson, ok, newId, now } from "plgg";
import { web, post, jsonResponse } from "plgg-server";
import { sql, exec, query, transaction, decodeRow } from "plgg-sql";

const app = pipe(
  web(),
  post("/articles", (c) =>
    proc(
      c.req.body,
      decodeJson,                                                       // text → unknown
      asNewArticle,                                                     // → { name, memo: Option<string> }
      (a) => ok({ ...a, id: newId(), createdAt: now() }),               // stamp
      transaction(db, (a) =>
        proc(
          sql`INSERT INTO articles (id, createdAt, name, memo)
              VALUES (${a.id}, ${a.createdAt}, ${a.name}, ${a.memo})`,
          exec(db),
          () => query(db)(sql`SELECT id, createdAt, name, memo FROM articles WHERE id = ${a.id}`),
          decodeRow(asArticle),
        ),
      ),
      (article) => jsonResponse(article, 201),
    ).then(mapErr(toHttpError)),                                        // any error → HttpError, once, at the edge
  ),
);
```

```typescript
// app.ts — the client is one Elm-Architecture program (plgg-view): an immutable
// Model, a pure `update` folding each Msg, and a pure `view(model): Html<Msg>`.
// No JSX — Elm-style hyperscript builders, and handlers are typed to produce Msg.
import { div, h1, button, text, onClick, type Html } from "plgg-view";
import { sandbox } from "plgg-view/client";

type Model = Readonly<{ count: number }>;
type Msg = "Inc" | "Dec";

const update = (msg: Msg, m: Model): Model =>
  msg === "Inc" ? { count: m.count + 1 } : { count: m.count - 1 };

const view = (m: Model): Html<Msg> =>
  div([], [
    h1([], [text(`count: ${m.count}`)]),
    button([onClick("Dec")], [text("-")]),
    button([onClick("Inc")], [text("+")]),
  ]);

// the runtime owns state + the DOM; mount renders view(init), each Msg re-renders.
sandbox({ init: { count: 0 }, update, view })(document.body);
```

On the server, `mapErr(toHttpError)` lives once at the edge — `SqlError`, `InvalidError`, anything else folds to the same `HttpError` vocabulary. On the client, the `Model`, the `Msg`, and the `view` are all just plgg values flowing through pure functions. The **same** `view` renders both ways: plgg-server's `pageResponse({ root: view(init), clientEntry })` folds `Html<Msg>` through plgg-view's `renderToString` for server-side first paint, then ships a script that boots the client `sandbox` to take over the same DOM node. (Live JSON still flows as values — `plgg-fetch`'s typed `get`/`post` return `PromisedResult<HttpResponse, ClientError>` — wiring those into `update` awaits a `Cmd` effect phase.)

The SSR + CSR round-trip over one Elm-Architecture program is in [`packages/example/`](packages/example/).

## Project Structure

This is a monorepo. Every package below has its own `README.md` (linked from
its name); this section is the top-level index that links down to each.

**Core**

- **[`packages/plgg/`](packages/plgg/)** - Core library: type-safe functional primitives (Result, Option, pipelines, branded types, numeric types)

**HTTP family**

- **[`packages/plgg-http/`](packages/plgg-http/)** - Runtime-neutral HTTP model (request/response/status/method/error) — pure data + builders, no `node:http`/`fetch`. The shared base both plgg-server and plgg-fetch build on, so neither imports the other.
- **[`packages/plgg-server/`](packages/plgg-server/)** - Server-side web router and HTTP handler built from scratch on plgg (pipeline-composed `Web`, node:http adapter), consuming plgg-http's model
- **[`packages/plgg-fetch/`](packages/plgg-fetch/)** - Typed HTTP client built from scratch on plgg, symmetric peer of plgg-server — both share plgg-http's model (`fetch` seam, errors as values)

**View & routing**

- **[`packages/plgg-view/`](packages/plgg-view/)** - Minimal Elm Architecture (TEA) for the browser: a typed `Html<Msg>` view tree (Elm-style hyperscript builders, no JSX), pure `sandbox`/`application` runtimes, and SSR `renderToString`. Built on plgg only.
- **[`packages/plgg-router/`](packages/plgg-router/)** - Pure client-side path toolkit: compile/match path patterns (`:param`/`*wildcard`) and parse the query string into `Location` data — view-free and DOM-free. Consumed by plgg-view's `application` runtime, which owns the History/render loop. plgg-server's `Routing` is the server-side path → `HttpResponse` matcher; plgg-router shares its `Segment`/`:param`/`*` vocabulary by parallel definition.

**Data**

- **[`packages/plgg-sql/`](packages/plgg-sql/)** - SQL as data-last pipeline steps built from scratch on plgg: tagged-template queries, transactions, and typed row mapping that drop into a `proc`/`pipe` chain; the database driver lives at an app-supplied seam
- **[`packages/plgg-db-migration/`](packages/plgg-db-migration/)** - Minimal dbmate-style schema-migration tool on plgg + plgg-sql: single-file up/down migrations, a `schema_migrations` ledger, on-demand per-tenant SQLite, zero new dependencies

**AI**

- **[`packages/plgg-kit/`](packages/plgg-kit/)** - LLM provider abstractions (OpenAI, Anthropic, Google) with structured output support
- **[`packages/plgg-foundry/`](packages/plgg-foundry/)** - AI-powered workflow orchestration with a register machine model

**CLI**

- **[`packages/plgg-cli/`](packages/plgg-cli/)** - Toolkit for building command-line program wrappers on plgg: typed commands/options, argv parsing, and a Result-to-exit-code fold with an auto-generated usage banner

**Docs & build toolchain**

- **[`packages/plgg-md/`](packages/plgg-md/)** - Markdown-to-typed-data parser on plgg: a frontmatter splitter and block tokenizer producing an immutable `Box`-union AST (Result, never throws)
- **[`packages/plgg-highlight/`](packages/plgg-highlight/)** - Zero-dep TS/TSX/JS/JSX/JSON syntax highlighting for plgg-md's `Highlighter` seam, tokenizing with an in-house plgg-parser grammar (no `typescript` dependency) into classified plgg-view `Html` spans
- **[`packages/plgg-parser/`](packages/plgg-parser/)** - Zero-new-dep generic parser combinator library on plgg: data-last `Parser<A,S>` functions returning `Result<Parsed<A,S>>`, a user-state slot for context-sensitive grammars, and a TS-lexer demo (the eventual in-house replacement for plgg-highlight's compiler scanner)
- **[`packages/plggmatic/`](packages/plggmatic/)** - Pre-organized, composable full-stack web-application framework on the plgg family: config loading, a router builder, static-build orchestration, and a pre-organized CLI
- **[`packages/plggpress/`](packages/plggpress/)** - VitePress-like static-site generator built on plggmatic: a typed `SiteConfig` contract, a base-path href resolver, a config CLI, and a build-time dead-link checker — the engine that builds the guide
- **[`packages/plgg-bundle/`](packages/plgg-bundle/)** - In-house minimal library bundler (dual ESM+CJS output + a per-file `.d.ts` tree) and dev server, plgg-free with zero new dependencies (reuses the project's own TypeScript)
- **[`packages/plgg-test/`](packages/plgg-test/)** - In-house minimal test runner (the `plgg-test` bin every package's test/coverage scripts call): discovery, assertions/matchers, mocks, and a coverage threshold gate

**Site & tutorial**

- **[`packages/guide/`](packages/guide/)** - The official plgg family guide: a plggpress-built static documentation site (private `@plgg/guide`, not published)
- **[`packages/example/`](packages/example/)** - Example usage project: the SSR + CSR round-trip over one Elm-Architecture program

## Installation

```bash
# Core library
npm install plgg

# LLM provider abstractions (depends on plgg)
npm install plgg-kit

# AI workflow orchestration (depends on plgg and plgg-kit)
npm install plgg-foundry

# Runtime-neutral HTTP model (depends on plgg)
npm install plgg-http

# Web router and HTTP handler (depends on plgg, plgg-http, plgg-view)
npm install plgg-server

# Typed HTTP client (depends on plgg and plgg-http)
npm install plgg-fetch

# Minimal Elm Architecture view layer (depends on plgg)
npm install plgg-view

# Pure client-side path toolkit (depends on plgg)
npm install plgg-router
```

## Core Concepts

### Result\<T, E\> - Error Handling Without Exceptions

`Result` represents either success (`Ok<T>`) or failure (`Err<E>`). All validation and transformation functions return `Result` instead of throwing.

```typescript
import { ok, err, isOk, isErr } from "plgg";

const success = ok(42);      // Ok<number>
const failure = err("oops");  // Err<string>

if (isOk(success)) {
  console.log(success.content); // 42
}
```

### Option\<T\> - Null-Safe Values

`Option` represents either a value (`Some<T>`) or absence (`None`), replacing `null`/`undefined`.

```typescript
import { some, none, isSome, isNone } from "plgg";

const value = some("hello"); // Some<string>
const empty = none();        // None

if (isSome(value)) {
  console.log(value.content); // "hello"
}
```

### Box\<TAG, CONTENT\> - Tagged Union Foundation

`Box` is the universal tagged container that underlies `Ok`, `Err`, `Some`, `None`, `Str`, and all nominal types. Every `Box` has a `tag` discriminant and a `content` payload.

### cast() - Synchronous Type-Safe Validation

`cast` composes synchronous functions that return `Result`, short-circuiting on the first error while accumulating sibling errors from property validations.

```typescript
import {
  cast, asObj, forProp,
  asNum, asSoftStr, asTime,
  isOk,
} from "plgg";
import type {
  Num, SoftStr, Time,
  Result, InvalidError,
} from "plgg";

type UserProfile = {
  id: Num;
  email: SoftStr;
  createdAt: Time;
};

const asUserProfile = (
  data: unknown,
): Result<UserProfile, InvalidError> =>
  cast(
    data,
    asObj,
    forProp("id", asNum),
    forProp("email", asSoftStr),
    forProp("createdAt", asTime),
  );

const result = asUserProfile({
  id: 1,
  email: "user@example.com",
  createdAt: "2025-01-01T00:00:00Z",
});

if (isOk(result)) {
  console.log(result.content);
}
```

### proc() - Async Pipeline Composition

`proc` handles sync/async/Result return types, unwrapping Promises and Results automatically and short-circuiting on errors.

```typescript
import { proc, isOk } from "plgg";

const result = await proc(
  5,
  (x: number) => x + 1,                    // sync
  (x: number) => Promise.resolve(x * 2),   // async
  (x: number) => `Result: ${x}`,           // sync
);

if (isOk(result)) {
  console.log(result.content); // "Result: 12"
}
```

### pipe() - Simple Function Composition

`pipe` passes a value through a chain of functions without Result wrapping.

```typescript
import { pipe } from "plgg";

const result = pipe(
  "hello world",
  (s: string) => s.split(" "),
  (words: string[]) => words.length,
); // 2
```

### match() - Exhaustive Pattern Matching

`match` provides type-safe exhaustive pattern matching for tagged unions, Result, and Option types.

```typescript
import {
  match, ok$, err$, otherwise,
} from "plgg";
import type { Result } from "plgg";

const describe = (
  r: Result<string, number>,
): string =>
  match(
    r,
    [ok$("hello"), () => "Greeting"],
    [err$(404), () => "Not found"],
    [otherwise, () => "Something else"],
  );
```

### env() - Safe Environment Variable Access

`env` returns a `Result` instead of a raw string, safe in both server and browser environments.

```typescript
import { env, isOk } from "plgg";

const apiUrl = env("API_URL");
if (isOk(apiUrl)) {
  console.log(apiUrl.content);
}
```

## Module Organization

plgg exports 11 module categories, all available as top-level imports from `"plgg"`:

| Category | Description | Key Exports |
|---|---|---|
| **Abstracts** | Typeclass interfaces | `Functor`, `Applicative`, `Monad`, `Foldable`, `Traversable`, `Castable`, `Refinable`, `JsonSerializable` |
| **Atomics** | Primitive validated types | `Num`, `Bool`, `BigInt`, `Bin`, `SoftStr`, `Time`, `Int` |
| **Basics** | Refined string and integer types | `Str`, `Float`, `I8`-`I128`, `U8`-`U128`, `CamelCase`, `PascalCase`, `KebabCase`, `SnakeCase`, `Alphabet`, `Alphanumeric` |
| **Collectives** | Array types | `Vec`, `MutVec`, `ReadonlyArray`, `VecLike` |
| **Conjunctives** | Object types | `Obj`, `Dict`, `RawObj` |
| **Contextuals** | Tagged containers | `Box`, `Ok`, `Err`, `Some`, `None`, `Icon`, `Pattern`, `NominalDatum`, `OptionalDatum` |
| **Disjunctives** | Union types and protocols | `Result`, `Option`, `Datum`, `JsonReady`, `Atomic`, `Basic`, `ObjLike` |
| **Exceptionals** | Error types | `BaseError`, `Exception`, `InvalidError`, `PlggError`, `DeserializeError`, `SerializeError` |
| **Flowables** | Composition primitives | `cast`, `proc`, `pipe`, `flow`, `match` |
| **Functionals** | Utility functions | `env`, `bind`, `conclude`, `debug`, `defined`, `filter`, `find`, `hold`, `pass`, `refine`, `tap`, `tryCatch`, `postJson`, `atIndex`, `atProp` |
| **Grammaticals** | Type-level constructs | `Brand`, `Function`, `NonNeverFn`, `Procedural`, `PromisedResult`, `BoolAlgebra` |

## Sub-packages

### plgg-kit

LLM provider abstractions with a unified `generateObject` interface supporting OpenAI, Anthropic, and Google. Provides type-safe structured output generation.

See [packages/plgg-kit/README.md](packages/plgg-kit/README.md) for details.

### plgg-foundry

AI-powered workflow orchestration using a register machine model. Define operations as `Processor`, `Switcher`, and `Packer` apparatus, and let an LLM generate an execution plan (`Alignment`) from a natural language request.

See [packages/plgg-foundry/README.md](packages/plgg-foundry/README.md) for details.

### plgg-http

The runtime-neutral HTTP model both plgg-server and plgg-fetch build on: `Method`, `HttpStatus`/`statusOf`, `HttpRequest`, `HttpResponse`/`ResponseBody` (+ `textResponse`/`jsonResponse`/…), and the `HttpError` failure vocabulary (`notFound$`/`badRequest$`/… + `httpErrorToResponse`) — pure plgg data and builders, no `node:http`/`fetch`/DOM. Extracting it below both packages keeps them true peers (neither imports the other).

See [packages/plgg-http/README.md](packages/plgg-http/README.md) for details.

### plgg-server

A server-side web router and HTTP request handler built from scratch on plgg — no external HTTP framework. The app is a pure-data `Web` value assembled through `pipe` (data-last `get`/`post`/`use`/`route` transformers, no method chaining); `handle` runs it plgg-natively while `toFetch` is the Web-standard `Request`/`Response` seam. Path params/wildcards, onion-model middleware, and a `node:http` adapter (`serve`).

See [packages/plgg-server/README.md](packages/plgg-server/README.md) for details.

### plgg-fetch

A typed HTTP client built from scratch on plgg — the symmetric peer of plgg-server (both build on plgg-http's shared model; neither imports the other). `request`/`get`/`post`/`put`/`patch`/`del` return `PromisedResult<HttpResponse, ClientError>`; the native `fetch`/`Request`/`Response` types live only at one seam (`toFetchRequest`/`fromFetchResponse`). A non-2xx status is a valid `HttpResponse`; only a transport failure folds to a `NetworkError`.

See [packages/plgg-fetch/README.md](packages/plgg-fetch/README.md) for details.

### plgg-view

A minimal Elm Architecture (TEA) for the browser. An app is three pure values — an immutable `Model`, an `update: (Msg, Model) => Model`, and a `view: (Model) => Html<Msg>` — driven by a tiny runtime. The view is a typed `Html<Msg>` tree authored with Elm-style hyperscript builders (`div`/`button`/`text`/…, no JSX) whose handlers produce `Msg`. Ships two entries: the SSR-safe core (`Html`, folds, `renderToString`) and `plgg-view/client` (the `sandbox`/`application` runtimes + DOM render).

See [packages/plgg-view/README.md](packages/plgg-view/README.md) for details.

### plgg-router

A pure client-side path toolkit: `compilePattern`/`matchSegments`/`parseQuery`/`param`/`query` turn a URL into `Location` data (captured `:param`s + parsed query), returning data and never a view. View-free and DOM-free — plgg-view's `application` runtime consumes it for routing while owning the History/render loop. Shares the `Segment`/`:param`/`*wildcard` vocabulary with plgg-server's server-side `Routing` by parallel definition (no import edge).

See [packages/plgg-router/README.md](packages/plgg-router/README.md) for details.

### plgg-sql

SQL as data-last pipeline steps built from scratch on plgg: tagged-template queries, transactions, and typed row mapping that drop into a `proc`/`pipe` chain. The database driver lives entirely at an app-supplied seam; the only runtime dependency is plgg.

See [packages/plgg-sql/README.md](packages/plgg-sql/README.md) for details.

### plgg-db-migration

A minimal, dbmate-style schema-migration tool on plgg + plgg-sql: single-file `up`/`down` migrations, a `schema_migrations` ledger, and on-demand per-tenant SQLite. Ships a `plgg-db-migration` CLI bin.

See [packages/plgg-db-migration/README.md](packages/plgg-db-migration/README.md) for details.

### plgg-cli

A toolkit for building command-line program wrappers on plgg: declare commands and options as typed data, parse `process.argv` into a validated invocation, and fold the handler's `Result` into a shell outcome.

See [packages/plgg-cli/README.md](packages/plgg-cli/README.md) for details.

### plgg-md

A Markdown-to-typed-data parser on plgg: a frontmatter splitter and a block tokenizer for the plggpress subset that produce an immutable `Box`-union AST (`Result`, never throws). Underpins plggpress content parsing.

See [packages/plgg-md/README.md](packages/plgg-md/README.md) for details.

### plgg-highlight

Zero-dependency TS/TSX/JS/JSX/JSON syntax highlighting for plgg-md's `Highlighter` seam, tokenizing with an in-house plgg-parser grammar (no `typescript` dependency) into classified plgg-view `Html<never>` spans, with an escaped `<pre><code>` fallback.

See [packages/plgg-highlight/README.md](packages/plgg-highlight/README.md) for details.

### plgg-parser

A zero-new-dependency generic parser combinator library built purely on plgg. Parsers are data-last functions `Parser<A, S> = (ParseState<S>) => Result<Parsed<A, S>, InvalidError>`, composed with `pipe`/`flow`; failure is `Result`, optionality is `Option`, and a threaded user-state slot carries context (e.g. last-significant-token for regex-vs-division). Ships a TS-lexer demo that proves the core can lex TypeScript — the eventual in-house replacement for plgg-highlight's `ts.createScanner`.

See [packages/plgg-parser/README.md](packages/plgg-parser/README.md) for details.

### plggmatic

A pre-organized, composable full-stack web-application framework on the plgg family: config loading, a router builder, static-build orchestration, and a pre-organized CLI — the framework-generic seam an app supplies its content/render specifics to.

See [packages/plggmatic/README.md](packages/plggmatic/README.md) for details.

### plggpress

A VitePress-like static-site generator built on plggmatic: a typed `SiteConfig` contract, a single base-path href resolver, a config-loading CLI, and a build pipeline with a build-time dead-link checker. It is the engine that builds this guide.

See [packages/plggpress/README.md](packages/plggpress/README.md) for details.

### plgg-bundle

The monorepo's in-house minimal library bundler (dual ESM+CJS output plus a per-file `.d.ts` tree) and dev server — plgg-free with zero new dependencies, reusing the project's own TypeScript.

See [packages/plgg-bundle/README.md](packages/plgg-bundle/README.md) for details.

### plgg-test

The in-house minimal test runner — the `plgg-test` bin every package's test/coverage scripts call: spec discovery, assertions and matchers, mocks, and a coverage threshold gate.

See [packages/plgg-test/README.md](packages/plgg-test/README.md) for details.

## Development

```bash
# Install dependencies for all packages
scripts/npm-install.sh

# Type check
scripts/tsc-plgg.sh

# Run tests
scripts/test-plgg.sh

# Run tests with coverage
scripts/coverage-plgg.sh

# Build all packages
scripts/build.sh

# Sub-package tests
scripts/test-plgg-kit.sh
scripts/test-plgg-foundry.sh
scripts/test-plgg-server.sh
scripts/test-plgg-fetch.sh

# Run all checks (type check + test for all packages)
scripts/check-all.sh
```

## License

[MIT License](LICENSE) - Copyright (c) 2025 qmu
