---
created_at: 2026-07-22T12:01:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Added
depends_on: []
claim: work-20260801-191025
---

# plgg-fetch: GCP service-account OAuth token exchange

Split out of `20260719043544-plgg-fetch-auth-streaming-timeout-multipart-binary`.
That ticket delivered the tractable transport core (timeout, streaming/binary
reads, multipart, and the `bearerAuth` / `versionedAuth` header shapes); the
crypto-bearing signing families were deferred so each gets a careful,
correctly-tested implementation.

## Overview

Add a **GCP service-account OAuth** helper so a seam can obtain an access token
(and thus a `Bearer` header) through `plgg-fetch` with no vendor SDK. The flow:
build a JWT (`{ iss, scope, aud, iat, exp }` claims), sign it **RS256** with the
service-account private key, then POST the `urn:ietf:params:oauth:grant-type:jwt-bearer`
assertion to Google's token endpoint and read the returned `access_token` — the
exchange itself rides the existing `post` + `decodeJsonBody`.

## Key files

- `packages/plgg-fetch/src/domain/usecase/auth.ts` (extend, or a new
  `sign/gcpOAuth.ts`).
- RS256 signing: **Web Crypto** (`crypto.subtle.importKey` / `sign`) behind the
  vendor boundary — no new dependency.

## Approach

- A `PromisedResult`-returning helper `{ clientEmail, privateKey, scope }` →
  `access token`, composing the JWT build + RS256 sign (vendor seam) with the
  token-endpoint `post`. A typed error on a signing or exchange failure — never a
  throw.

## Quality Gate

- **Acceptance:** the JWT header/claims/signing input match the documented GCP
  shape (verified against a fixture key + expected assertion), and the token
  exchange is expressed through `plgg-fetch` (`post` + `decodeJsonBody`, stubbed
  in tests) — no raw `fetch`, no vendor SDK. No new dependency; no `as`/`any`.

## Policies

- `workaholic:design` (vendor-neutrality).
- `workaholic:implementation` (anti-corruption-structure) — crypto at the vendor
  seam; the token exchange reuses the typed transport.

## Final Report

Development completed as planned. A GCP service-account can now be exchanged
for an access token through plgg-fetch with no vendor SDK and no new
dependency: RS256 signing rides Web Crypto at a vendor seam, and the exchange
itself goes through this package's own `post` + `decodeJsonBody`.

### Discovered Insights

- **Insight**: The obvious way to test an RS256 signer is a committed fixture
  key plus an expected assertion. That is the wrong shape twice over — it puts
  a real (if disposable) private key in the repository, where it correctly
  trips every credential scanner, and it makes the test compare our output to
  our own earlier output. Generating a throwaway key pair per run and checking
  our Web Crypto signature against **Node's `crypto`** over the same input is
  strictly better: nothing is committed, and RS256's determinism turns the
  comparison into a genuine interoperability proof rather than a
  self-consistency one.
  **Context**: the same reasoning applies to any deterministic signature
  algorithm. Where a second implementation is already on the machine, use it as
  the oracle instead of a recorded value.

- **Insight**: `encodeJson` returns a `Result`, and for a closed claim set of
  strings and numbers its error arm is unreachable — so composing it would have
  threaded an uncoverable branch through the whole signing path. Rendering the
  claims JSON explicitly (`gcpClaimsJson`) is total, and it also pins the key
  order, which a JWT needs because the signature covers *bytes* rather than an
  object. Each value still goes through `JSON.stringify`, so a quote in an
  email or scope is escaped rather than breaking out of the string.
  **Context**: a wire format whose bytes are load-bearing wants an explicit
  writer, not a general serializer — and "unreachable error arm" is a signal
  that the fallible API is the wrong tool, not that the branch needs a test.

- **Insight**: `issuedAtSeconds` is a parameter rather than a clock read inside
  the helper. That keeps every step below the transport a pure function of its
  inputs, which is what makes it possible to assert a whole signing input
  against a fixed expected string.
  **Context**: the same shape as the SigV4 sibling's `Sigv4Instant` — in both,
  moving the clock to the call site is what made the interesting part testable.

- **Insight**: This branch and the SigV4 branch (PR #97) each create
  `packages/plgg-fetch/src/vendors/webcrypto.ts`, because both were cut from
  `main` as separate PR-units. Whichever merges second will hit a content
  conflict on that one file.
  **Context**: the conflict is mechanical — both versions are collections of
  small pure functions over the same seam, and the union is what the file
  should end up containing (`sha256Hex`/`hmacSha256` from SigV4,
  `rs256Sign`/`toBase64Url`/`pemToDer` from here, sharing `utf8Bytes`). The
  split was made because the parent ticket said a signer "must not be rushed
  into a batch"; that instruction was about implementation care, and honouring
  it at the PR-unit level is what produced the overlap.
