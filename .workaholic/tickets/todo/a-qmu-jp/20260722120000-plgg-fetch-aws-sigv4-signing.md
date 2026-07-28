---
created_at: 2026-07-22T12:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Added
depends_on: []
---

# plgg-fetch: AWS SigV4 request-signing helper

Split out of `20260719043544-plgg-fetch-auth-streaming-timeout-multipart-binary`.
That ticket delivered the tractable transport core (timeout, streaming/binary
reads, multipart, and the `bearerAuth` / `versionedAuth` header shapes). The two
crypto-bearing signing families were deferred because each needs a careful,
test-vector-verified implementation — a subtly-wrong signer is a silent security
failure, so it must not be rushed into a batch.

## Overview

Add an **AWS Signature Version 4** request-signing helper so a seam can issue a
signed AWS request through `plgg-fetch` with no vendor SDK. SigV4 is: build the
canonical request (method, canonical URI, canonical query, canonical + signed
headers, hashed payload), derive the signing key through the HMAC-SHA256 chain
(`date → region → service → "aws4_request"`), sign the string-to-sign, and emit
the `Authorization` header (plus `x-amz-date`, and `x-amz-content-sha256` for
S3).

## Key files

- `packages/plgg-fetch/src/domain/usecase/auth.ts` (extend, or a new
  `sign/sigv4.ts`).
- Hashing/HMAC: use **Web Crypto** (`crypto.subtle`) behind the vendor boundary
  (async, platform type) — never a new dependency (vendor-neutrality).

## Approach

- A helper producing the signed header `Dict` (or a request transform) from
  `{ accessKeyId, secretAccessKey, sessionToken?, region, service }` + the
  request. Because `crypto.subtle` is async and a Web type, the actual
  hashing/HMAC belongs at the vendor seam, with a plgg-native signing surface in
  the domain.

## Quality Gate

- **Acceptance:** a signed request matches AWS's **published SigV4 test-suite
  vectors** (the canonical request, string-to-sign, and final signature for at
  least the standard GET/POST cases) — verified by tests over those vectors. No
  new dependency; no `as`/`any`.

## Policies

- `workaholic:design` (vendor-neutrality) — signing lets all providers sit behind
  the one transport rather than privileging SDK-shipped ones.
- `workaholic:implementation` (anti-corruption-structure) — keep the crypto at
  the vendor seam; the domain sees a plgg-native signing surface.
