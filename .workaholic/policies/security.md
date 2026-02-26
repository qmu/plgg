---
title: Security Policy
description: Security practices covering authentication, authorization, secrets management, and input validation for the plgg monorepo.
category: developer
modified_at: 2026-02-26T04:50:00+09:00
commit_hash: ddbb696
---

[English](security.md) | [Japanese](security_ja.md)

# Security Policy

This policy documents implemented security practices across the plgg monorepo. plgg is an open-source TypeScript library with no end-user authentication surface — it is consumed as a library dependency. Security concerns therefore center on API credential handling in `plgg-kit` and `plgg-foundry`, type-safe input validation enforced by the `plgg` core type system, and supply-chain hygiene controlled by CI and `.gitignore`. Every statement below cites its enforcement mechanism. Areas with no evidence are marked "not observed."

## Authentication

The plgg monorepo contains no user-facing authentication layer. Authentication in this codebase means authenticating library callers to third-party LLM vendor APIs.

`plgg-kit` implements a two-mode API key resolution strategy. When a `Provider` value is constructed with an explicit `apiKey` field (`openai({ model: "...", apiKey: "..." })`), that key is used directly. When no inline key is present, `generateObject` calls the `env` utility from `plgg` to read `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` from `process.env`. This is enforced in `src/plgg-kit/src/LLMs/usecase/generateObject.ts` (lines 36-52). The `env` function returns a typed `Result<string, Exception>` and explicitly fails with an `Exception` if the variable is absent or empty (`src/plgg/src/Functionals/env.ts` lines 28-34). The `proc` pipeline propagates that failure as an `Err` without throwing.

API keys are transmitted over HTTPS only. All three vendor adapters POST to their respective vendor endpoints using `https://` URLs: `https://api.openai.com/v1/responses` (OpenAI.ts line 44), `https://api.anthropic.com/v1/messages` (Anthropic.ts line 44), and `https://generativelanguage.googleapis.com/v1beta/...` (Google.ts line 52). Keys are passed in HTTP headers (`Authorization: Bearer`, `x-api-key`, `x-goog-api-key`) and not in URL query parameters.

No session management, token refresh, or multi-factor authentication mechanisms exist. These are not applicable to a library with no user session concept.

## Authorization

No role-based or attribute-based access control exists. The project is a library with no server, no user database, and no permission model. Authorization of LLM operations is entirely delegated to the vendor APIs via the API keys provided by the caller.

Within `plgg-foundry`, the operation execution engine enforces one internal guard: `maxOperationLimit`. If `ctx.operationCount >= ctx.foundry.maxOperationLimit`, the `execute` function returns `err(new Error("Operation limit exceeded"))` immediately (`src/plgg-foundry/src/Foundry/usecase/operate.ts` lines 71-77). This prevents unbounded execution loops in AI-generated alignment sequences. The default limit is 10, set in `makeFoundry` (`src/plgg-foundry/src/Foundry/model/Foundry.ts` line 69).

Operation dispatch in `operate.ts` validates opcodes against the registered apparatus list. If a `process` or `switch` operation references an opcode not found in `foundry.apparatuses`, `findProcessor` or `findSwitcher` returns an `Err` immediately (`src/plgg-foundry/src/Foundry/model/Foundry.ts` lines 86-115). This prevents AI-generated alignments from invoking arbitrary code paths outside the declared apparatus set.

The GitHub Actions workflows apply least-privilege permission scoping. The `run-tests.yml` workflow declares `permissions: issues: write; pull-requests: write` with no broader repository access. The `prepare-release.yml` workflow declares `permissions: id-token: write; contents: read; pull-requests: write` and re-declares them at the job level, following defense-in-depth. The `start-pull-request.yml` workflow declares `permissions: id-token: write; issues: write; contents: write; pull-requests: write`, limited to what the PR creation flow requires.

## Secrets Management

API keys for LLM vendors are never stored in the repository. The `.gitignore` at the repository root excludes `.env` and `.env.*` (lines 13-15 of `.gitignore`), preventing accidental commit of `.env` files containing secrets. The `.env.example` files in `src/plgg-foundry/` and `src/plgg-kit/` each document the three expected variable names (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) with empty values, serving as a template without real keys.

Claude Code project-level settings (`settings.local.json`) are excluded from version control via `.gitignore` (`**/.claude/settings.local.json`), preventing local editor credentials or tokens from being committed.

No secrets are embedded in source code or workflow files. The `release.yml` and `prepare-release.yml` workflows use the GitHub-provided `secrets.GITHUB_TOKEN`, which is automatically provisioned by GitHub Actions with the declared minimum permissions and is never stored as a user-managed secret.

No secrets rotation policy, vault integration, or secret scanning configuration is observed in the repository.

## Input Validation

Input validation is implemented as a foundational library feature in the `plgg` core package using a typed cast system. Every domain type exports an `as*` cast function that applies a chain of `cast` and `forProp` combinators. A failed cast returns an `Err<InvalidError>` rather than throwing. This pattern is implemented in every Atomics, Basics, Collectives, Conjunctives, and Contextuals module.

The `plgg-foundry` order input is validated before any LLM call. `asOrder` in `src/plgg-foundry/src/Foundry/model/Order.ts` casts the `text` field through `asStr` (which enforces non-empty string constraints) and the `files` field through `asReadonlyArray(asBin)`. An invalid order causes `runFoundry` to return an `Err` before calling `blueprint`.

LLM response validation is enforced after every AI call. The `blueprint` function passes LLM output through `asAlignment` before execution (`src/plgg-foundry/src/Foundry/usecase/blueprint.ts` line 430). `asAlignment` applies the full cast chain over all alignment fields. A malformed LLM response causes `blueprint` to return an `Err` rather than executing an invalid alignment.

Assign operation values are stored as JSON strings via `toJsonString` and parsed at read time via `parseJsonValue`, both in `operate.ts` (lines 115-135). The `parseJsonValue` function wraps `JSON.parse` in a try-catch, returning the raw string on failure rather than throwing (`operate.ts` lines 126-135). This prevents malformed `assign` values from crashing the executor.

The `proc` pipeline catches all thrown exceptions at each step and wraps them in an `Exception` with the original error as `parent` (`src/plgg/src/Flowables/proc.ts` lines 949-963). User-provided apparatus functions are called through `tryCatch` (`src/plgg/src/Functionals/tryCatch.ts`), which catches both sync and async exceptions and returns `Err`. This ensures no unhandled exceptions escape the pipeline boundary.

The TypeScript compiler configuration in each package's `tsconfig.json` enforces `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, and `noImplicitReturns: true`. These settings eliminate entire classes of type confusion at compile time. The CI workflow (`run-tests.yml`) runs `npx tsc --noEmit` as an explicit step before test execution, ensuring compilation errors block merges.

No sanitization of HTML or SQL content is implemented. This is not applicable because the codebase contains no HTML rendering and no database layer.

## Observations

The codebase demonstrates a consistent security-through-types approach. The `Result<T, E>` type returned by all pipeline primitives forces callers to handle error paths explicitly. There is no null propagation or silent failure. The branded type system (`Brand<T, B>`) prevents values of the same primitive type from being confused at different domain roles. The `tryCatch` wrapper and `proc`'s internal catch ensure that third-party apparatus code (user-supplied processor and switcher functions) cannot crash the runtime with unhandled exceptions.

The three LLM vendor adapters are fully isolated in the `vendor/` subdirectory of `plgg-kit`. Each adapter only accepts and returns language primitives and plgg domain types; no vendor SDK objects escape the adapter boundary. This is the codebase's explicit vendor isolation strategy.

The GitHub Actions workflows pass a pinned `ref` for `actions/checkout@v4` (using the SHA-pinned versions of the GitHub-maintained actions) and apply job-level permission constraints consistently. No third-party actions with broad repository access are observed.

The `lodash` dependency in `src/example/` (PR #10, open since 2026-01-23) has known prototype pollution vulnerabilities in version 4.17.21. This is an unresolved Dependabot finding affecting the unpublished `example` package. Three Dependabot PRs are open and unmerged.

## Gaps

No secret scanning configuration (e.g., GitHub Advanced Security secret scanning, `gitleaks`, or `trufflehog`) is observed in the repository. There is no automated mechanism to prevent API keys from being accidentally committed beyond `.gitignore`.

No dependency vulnerability scanning workflow is configured in CI. Dependabot PRs are raised but not automatically merged or triaged. There is no `npm audit` step in the `run-tests.yml` workflow.

No Content Security Policy, rate limiting, or request signing is implemented. Not applicable: the library makes outbound API calls and does not expose an HTTP server.

No security changelog section, vulnerability disclosure policy (`SECURITY.md`), or responsible disclosure contact is observed in the repository.

No secrets rotation policy or vault integration is observed.

No SBOM (Software Bill of Materials) generation or dependency license compliance check is observed in CI.
