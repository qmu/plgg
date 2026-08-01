---
created_at: 2026-07-22T12:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Added
depends_on: []
claim: work-20260801-184834
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

## Final Report

Development completed as planned. AWS SigV4 request signing is available
through plgg-fetch with no vendor SDK and no new dependency: hashing and HMAC
ride Web Crypto at a second vendor seam (`src/vendors/webcrypto.ts`), and the
domain sees a plgg-native, mostly-pure signing surface.

Verified against **AWS's own published test-suite vectors**, not against our
own output.

### Discovered Insights

- **Insight**: Two of AWS's twenty published `basic` vectors —
  `post-x-www-form-urlencoded` and `post-x-www-form-urlencoded-parameters` —
  **contradict themselves**: the hash on the last line of their `.sts` is not
  the SHA-256 of the `.creq` shipped beside them, and for the first the
  `SignedHeaders` differ too (its `.creq` signs `content-length`, its `.authz`
  does not). No implementation can satisfy both halves at once.
  **Context**: this is the trap the ticket was written to avoid. A signer that
  "passes 20/20" has almost certainly special-cased something to match a
  self-inconsistent expectation and is wrong for real requests. The fixture
  records self-consistency as a **derived** field (computed with Node's
  `crypto`, an implementation independent of the one under test), the canonical
  request is asserted for all 20, the string-to-sign and signature for the 18
  that are self-consistent, and a test pins the exempt set to exactly those two
  names — so an implementation bug can never quietly widen the exemption.

- **Insight**: Duplicate header values are joined in **wire order, never
  sorted**. AWS's `get-header-value-order` vector sends `value4, value1,
  value3, value2` and signs exactly that sequence.
  **Context**: sorting them is the plausible-looking guess (the names are
  sorted, so the values "should" be too) and it produces a signature AWS
  rejects with no diagnostic beyond `SignatureDoesNotMatch`. Written from
  memory rather than from the vectors, this implementation would have had that
  bug.

- **Insight**: `encodeURIComponent` is not RFC 3986. It leaves `!`, `'`, `(`,
  `)` and `*` raw, and AWS canonicalizes by RFC 3986.
  **Context**: no vector in the basic set contains one of those five, so the
  suite does NOT catch this — it is caught only by knowing the spec. The
  package's own unit test covers it explicitly for that reason.

- **Insight**: Threading a `Result` error arm through the six-step signing
  chain produced five defensive branches that nothing can reach (Web Crypto
  with fixed algorithm literals does not fail), which is precisely the
  uncoverable-branch shape this repo's coverage gate punishes. Lifting the
  whole chain through one `tryCatch` instead — with the vendor seam returning
  plain promises, exactly as `toFetchRequest` in the fetch seam already does —
  removed all five and left the package at 100% statements/lines and 97.6%
  branches.
  **Context**: the general rule is that a failure mode a fixed input cannot
  reach belongs at one boundary, not in the type of every intermediate step.

- **Insight**: Path normalization is deliberately absent, and that is a
  correctness decision rather than an omission: SigV4 makes it per-service and
  S3 does not normalize, so normalizing here would corrupt S3 keys that
  legitimately contain `.` or `//` segments. AWS's own suite agrees — it keeps
  those cases in a separate group from the basic set.
