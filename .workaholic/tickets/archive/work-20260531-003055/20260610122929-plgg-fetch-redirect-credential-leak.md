---
created_at: 2026-06-10T12:29:29+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 1h
commit_hash: b5fdbb8
category: Changed
depends_on:
---

# Stop following redirects silently in fetch seams (credential leak)

## Overview

Neither `postJson` nor `plgg-fetch`'s request seam sets `redirect`, so the
platform default `redirect: "follow"` applies (up to 20 hops). Per the fetch
spec, only `Authorization` and cookies are stripped on a cross-origin redirect —
**custom headers are not**. Because every `plgg-kit` LLM vendor call sends its
API key as a custom header (`x-api-key`, `x-goog-api-key`) and OpenAI uses
`Authorization: Bearer` (stripped only cross-origin, not same-site), a
redirecting or compromised endpoint can harvest the credential, and the generic
client gives no way to opt out.

This single change closes the credential-leak-across-redirect vector for both the
generic HTTP client and every LLM call, and tightens overall SSRF posture.

Severity: **MEDIUM**.

## Key Files

- `packages/plgg/src/Functionals/postJson.ts` (lines 20-27) — builds `fetch(url, { method, headers, body })` with no `redirect`.
- `packages/plgg-fetch/src/Http/usecase/seam.ts` (`toRequestInit` lines 58-68; `toFetchRequest` lines 78-85) — same omission for the general client.
- `packages/plgg-kit/src/LLMs/vendor/OpenAI.ts`, `Anthropic.ts`, `Google.ts` — confirm all key-bearing calls route through `postJson` and inherit the fix.

## Implementation Steps

1. Set `redirect: "manual"` (or `"error"`) by default in `toRequestInit` (`plgg-fetch`) and in `postJson`.
2. Decide how a 3xx surfaces: with `"manual"`, expose the redirect as a typed `HttpResponse`/`HttpError` the caller inspects, rather than auto-following. Keep it within the existing `Result`/`Option` error channel — do not throw.
3. If transparent redirects are ever desired, expose an explicit `redirect` option on the request type and document that custom auth headers persist across same-site redirects, so opting in is a deliberate, signature-visible choice.
4. Tests: a 302 response is not auto-followed by default; a request with a custom auth header does not re-send it to the redirect target.

## Considerations

- **Conservative Vendor Dependence** (`standards:implementation`): the LLM vendor calls are hand-rolled over `fetch` precisely to keep vendor neutrality — the safe-by-default redirect posture must live in the shared seam so no individual vendor file has to remember it. (`packages/plgg-fetch/src/Http/usecase/seam.ts`, `packages/plgg/src/Functionals/postJson.ts`)
- **Domain Layer Separation**: the redirect/credential policy belongs in the thin HTTP entry/seam, not scattered across domain callers. (`packages/plgg/src/Functionals/postJson.ts`)
- SSRF note (out of scope but related): `plgg-fetch` does no URL scheme allow-listing or block of link-local/metadata addresses. Acceptable for a low-level client, but document it as a caller responsibility; a separate hardening ticket can add an optional allow-list hook.
- `postJson` also embeds the full upstream error body into its `Error` message (line 28-34), which can put prompt content/PII into logs — fold a redaction/truncation into this change or note it for a follow-up. (`packages/plgg/src/Functionals/postJson.ts`)
- Strict no-`as`/`any`/`ts-ignore` (CLAUDE.md); keep coverage >90%.

## Final Report

Development completed as planned, including the optional consideration (error-body
truncation). tsc clean; plgg 453 tests, plgg-fetch 27 (100% branch), plgg-kit 12
— all pass.

### Discovered Insights

- **Insight**: Under `redirect: "manual"`, `fetch` returns an *opaque* response
  (`type === "opaqueredirect"`, `status === 0`, body unreadable) — so the
  concrete 3xx status and `Location` are NOT recoverable. The honest surface is
  therefore a `RedirectError` ("a redirect happened, not followed"), not a
  reconstructed `HttpResponse` with the real status. Both seams detect the opaque
  marker rather than trying to read a status.
  **Context**: if a caller ever needs to follow a redirect deliberately, the
  request type would need an explicit opt-in `redirect` field (noted in the
  ticket) — there's no way to recover the target from the opaque response after
  the fact. (`packages/plgg-fetch/src/Http/usecase/seam.ts`)
