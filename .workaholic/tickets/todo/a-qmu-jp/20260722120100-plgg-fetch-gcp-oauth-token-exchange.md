---
created_at: 2026-07-22T12:01:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Added
depends_on: []
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
