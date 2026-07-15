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
- **[`packages/plgg-auth/`](packages/plgg-auth/)** - OIDC identity-provider toolkit built from scratch on plgg: the JOSE layer (base64url, JWK/JWKS with RFC 7638 thumbprint kids, JWS RS256, JWT claim validation) on WebCrypto only — pinned to the RFC test vectors and cross-checked against `node:crypto`

**AI**

- **[`packages/plgg-kit/`](packages/plgg-kit/)** - LLM provider abstractions (OpenAI, Anthropic, Google) with structured output support
- **[`packages/plgg-foundry/`](packages/plgg-foundry/)** - AI-powered workflow orchestration with a register machine model

**CLI**

- **[`packages/plgg-cli/`](packages/plgg-cli/)** - Toolkit for building command-line program wrappers on plgg: typed commands/options, argv parsing, and a Result-to-exit-code fold with an auto-generated usage banner

**Docs & build toolchain**

- **[`packages/plgg-md/`](packages/plgg-md/)** - Markdown-to-typed-data parser on plgg: a frontmatter splitter and block tokenizer producing an immutable `Box`-union AST (Result, never throws)
- **[`packages/plgg-highlight/`](packages/plgg-highlight/)** - Zero-dep TS/TSX/JS/JSX/JSON syntax highlighting for plgg-md's `Highlighter` seam, tokenizing with an in-house plgg-parser grammar (no `typescript` dependency) into classified plgg-view `Html` spans
- **[`packages/plgg-parser/`](packages/plgg-parser/)** - Zero-new-dep generic parser combinator library on plgg: data-last `Parser<A,S>` functions returning `Result<Parsed<A,S>>`, a user-state slot for context-sensitive grammars, and a TS-lexer demo (the eventual in-house replacement for plgg-highlight's compiler scanner)
- **[`packages/plggpress/`](packages/plggpress/)** - The slim VitePress-like static-site generator on the plgg family: a typed `SiteConfig` contract, a base-path href resolver, a config/`build` CLI, and a build-time dead-link checker — the engine that builds the guide. Carries its generic web-application framework internally and exposes it as a public `plggpress/framework` subpath (config loading, a router builder, static-build + CLI orchestration). No CMS/server dependencies — the dynamic content surface lives in `plgg-cms`
- **[`packages/plgg-cms/`](packages/plgg-cms/)** - The dynamic content-management surface that pairs with plggpress: CMS-owned content indexing/query, admin UI, durable-domain derivation, a read-only content delivery API, OIDC auth, content editing, media, stakeholder submission, ops, MCP protocol/tools, and agent surfaces — composed onto plggpress's `framework` seam and served as an always-on `node:http` instance (the `plgg-cms serve` bin, D5's dynamic half)
- **[`packages/plgg-bundle/`](packages/plgg-bundle/)** - In-house minimal library bundler (dual ESM+CJS output + a per-file `.d.ts` tree) and dev server, plgg-free with zero new dependencies (reuses the project's own TypeScript)
- **[`packages/plgg-test/`](packages/plgg-test/)** - In-house minimal test runner (the `plgg-test` bin every package's test/coverage scripts call): discovery, assertions/matchers, mocks, and a coverage threshold gate

**AI-generated IR (`plgg-ir` family)** — comprehensive guide: [docs/plgg-ir/guide.md](docs/plgg-ir/guide.md)

- **[`packages/plgg-ir-syntax/`](packages/plgg-ir-syntax/)** - Minimal S-expression syntax layer for the plgg-ir family on plgg-parser: position-aware `Sexp` trees, accumulated coded diagnostics (never throws), and a deterministic canonical printer with the `parse(print(parse(x))) = parse(x)` round-trip property
- **[`packages/plgg-ir-language/`](packages/plgg-ir-language/)** - Reusable static language framework on plgg-ir-syntax: form/operator registries (closed vocabulary), kinded scopes with two-phase declare/analyze (forward references), a type checker preserving domain types (`client-id ≠ organization-id`, `(money JPY) ≠ (money USD)`), expected/actual diagnostics, shorthand expansion, idempotent normalization with a canonical serializer, and collision-checked dialect composition
- **[`packages/plgg-ir-manifest/`](packages/plgg-ir-manifest/)** - The Domain Manifest dialect on plgg-ir-language: the versioned `(plgg-ir 1 (module ...))` vocabulary — entities, fields, domain types, relations, validation, invariants, aggregates, projections, policies, views, actions, derivations — with layered scope/boundary verification, deny-by-default authorization, a dependency graph with topological update planning (cycles are compile errors), and a deterministic canonical IR — what an LLM agent emits and plggmatic will interpret

**Site & tutorial**

- **[`packages/guide/`](packages/guide/)** - The official plgg family guide: a plggpress-built static documentation site (private `@plgg/guide`, not published)
- **[`packages/example/`](packages/example/)** - Example usage project: the SSR + CSR round-trip over one Elm-Architecture program
- **[`packages/plgg-poc-portal/`](packages/plgg-poc-portal/)** - plggpress PoC portal: the static index of the confidence-collection PoC fleet (private, served at `plgg-poc.qmu.dev`)
- **[`packages/plgg-poc1-search/`](packages/plgg-poc1-search/)** - PoC 1: browser-side full-text search vs vector RAG measured on the guide corpus (private, served at `plgg-poc1.qmu.dev`)
- **[`packages/plgg-poc2-agent/`](packages/plgg-poc2-agent/)** - PoC 2: reader-side embedded browser agent — grounded, cited answers over the shipped guide index, key confined to a server session seam (private, served at `plgg-poc2.qmu.dev`)
- **[`packages/plgg-poc3-voice/`](packages/plgg-poc3-voice/)** - PoC 3: writer-side voice assistant over the Realtime API — the agent drives the browser-local search by tool-calling keyword variations, ephemeral key minted server-side (private, served at `plgg-poc3.qmu.dev`)
- **[`packages/plgg-poc4-edit/`](packages/plgg-poc4-edit/)** - PoC 4: agent file edits with live hot reload — `edit_file` tool calls land on a seeded corpus copy through the dev server, the doc iframe hot-reloads, and the same Realtime session (voice + text) survives (private, served at `plgg-poc4.qmu.dev`)
- **[`packages/plgg-poc4b-coedit/`](packages/plgg-poc4b-coedit/)** - PoC 4b: live co-editing preview — the change happens ON the preview: granular `edit_doc` find/replace ops land on a live, patchable preview (the iframe retired), the edited span animated (erase → write) or diffed, no reload, the Realtime session unbroken (private, served at `plgg-poc4b.qmu.dev`)
- **[`packages/plgg-poc4c-livesite/`](packages/plgg-poc4c-livesite/)** - PoC 4c: watchable edits on the REAL rendered site — PoC 4's proxied plggpress page with 4b's animated in-place edit: a client injected into the proxied HTML maps each markdown find/replace onto a rendered span and animates it, while the dev server's hot reload is arbitrated (our own edit's reload absorbed, everyone else's released) (private, served at `plgg-poc4c.qmu.dev`)
- **[`packages/plgg-poc5-config/`](packages/plgg-poc5-config/)** - PoC 5: central configuration generation — the agent maintains the site's config as typed data (tag classification, path exclusions, layout + prefixed sizing themes); a deterministic typed-command parser drives every op (headless-replayable), the Realtime voice session emits the same ops, and the sample site re-renders live (private, served at `plgg-poc5.qmu.dev`)
- **[`packages/plgg-poc6-classify/`](packages/plgg-poc6-classify/)** - PoC 6: non-tree file classification — tag/link grouping over the tree-shaped corpus, navigated three comparable ways side by side (tag facets, link/backlink graph, multi-dimensional filter); a deterministic query-command parser drives each variant (headless-replayable, agent-drivable), the Realtime voice session emits the same queries (private, served at `plgg-poc6.qmu.dev`)

The Pragmatic design-system package, its documentation site, and its workbench now live outside this monorepo. This repository keeps the CMS admin UI inside `plgg-cms`; plggpress carries only the static theme support needed to build this guide.

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

### plgg-ir-syntax

The lowest layer of the `plgg-ir` package family (the restricted, typed, Lisp-style intermediate representation an LLM agent generates and deterministic consumers interpret). Parses S-expression source into position-aware `Sexp` trees (every node carries a `SourceRange`), accumulates structured ranged diagnostics with recovery instead of throwing, and prints trees back as deterministic canonical text — `parse(print(parse(x))) = parse(x)` holds under property tests. Built on plgg-parser's combinators; assigns no domain meaning (the `entity`/`policy` vocabulary belongs to the upcoming `plgg-ir-language` / `plgg-ir-manifest` layers).

See [packages/plgg-ir-syntax/README.md](packages/plgg-ir-syntax/README.md) for details.

### plgg-ir-language

The `plgg-ir` family's reusable static language-processing framework on plgg-ir-syntax. A dialect statically registers forms, typed operators, shorthand expanders, and normalizers over its own node type; the framework contributes kinded scopes with two-phase declare/analyze (so forward references resolve), an expression type checker that preserves domain meaning over storage types with expected/actual diagnostics, diagnostic accumulation across every pass, an expansion pass with a self-production bound, idempotent normalization with a canonical serializer, collision-checked dialect composition, and the `parse → expand → analyze → normalize → canonical` pipeline. It defines no Domain Manifest vocabulary — that is `plgg-ir-manifest`, the next layer.

See [packages/plgg-ir-language/README.md](packages/plgg-ir-language/README.md) for details.

### plgg-ir-manifest

The Domain Manifest dialect — the `plgg-ir` family's domain-specific layer. `compileManifest` takes a restricted, typed, Lisp-style `(plgg-ir 1 (module ...))` source (the artifact an LLM agent generates), statically verifies it — closed vocabulary at every level, domain-type-preserving expression checking, boolean-typed validation conditions and invariants, relation target/inverse pairing, aggregate root/member/uniqueness/relatedness — and produces the resolved `Module` model plus deterministic canonical text (stable ordering, expression operands untouched; equivalent sources normalize identically). Phases 4–5 (views/policies/actions, derivations/consistency) grow this same dialect.

See [packages/plgg-ir-manifest/README.md](packages/plgg-ir-manifest/README.md) for details.

### plggpress

The slim VitePress-like static-site generator on the plgg family: a typed `SiteConfig` contract, a single base-path href resolver, a config-loading `build` CLI, and a build pipeline with a build-time dead-link checker. It is the engine that builds this guide. plggpress carries its generic web-application framework internally (config loading, a router builder, static-build + CLI orchestration) and publishes it as a `plggpress/framework` subpath. It depends on no CMS/server packages — the dynamic content surface was split out into `plgg-cms`.

See [packages/plggpress/README.md](packages/plggpress/README.md) for details.

### plgg-cms

The dynamic content-management surface that pairs with plggpress. Where plggpress renders the public reader path (SSG/CDN), plgg-cms is the always-on half — CMS-owned content indexing and query functions, an admin UI, a read-only content delivery API (`contentApi`), OIDC auth, content editing, media, stakeholder submission, ops, MCP protocol/tools, and agent surfaces — composed onto plggpress's `framework` seam and served as a persistent `node:http` instance via the `plgg-cms serve` bin (D5). The dependency direction is one-way: plgg-cms depends on plggpress, never the reverse.

See [packages/plgg-cms/README.md](packages/plgg-cms/README.md) for details.

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

# Run tests (coverage is collected and gated on every run)
scripts/test-plgg.sh

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
