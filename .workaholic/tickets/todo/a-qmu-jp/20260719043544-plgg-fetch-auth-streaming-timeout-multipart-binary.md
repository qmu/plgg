---
created_at: 2026-07-19T04:35:44+09:00
author: a-qmu-jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on:
---

# plgg-fetch: no auth/signing helpers or streaming reader; no timeout; no multipart/binary body

Dogfooding feedback from rebuilding a real TypeScript codebase on the plgg family.
`plgg-fetch` is a clean typed transport, but three capability gaps forced several
seams to keep their vendor SDK or fall back to raw `fetch`, defeating the goal of
a single typed transport under every outbound call.

## 3. No auth/signing helper family and no streaming response reader (high)

Replacing a provider SDK with a direct `requestJson`/`requestText` call requires
re-implementing the auth and streaming the SDK encapsulated. Simple bearer +
versioned-header auth is easy to hand-roll, but AWS SigV4 request signing and GCP
OAuth token exchange are not, and there is no plgg helper to lean on; likewise
there is no streaming response reader for incremental / served-events responses.
Seams that need signed requests or streaming must keep their vendor SDK.

**Request:** an auth-helper family (bearer + versioned headers, AWS SigV4, GCP
OAuth) and a streaming response reader on `plgg-fetch`.

## 4. No request timeout / cancellation (medium)

`RequestOptions` is `{ headers?, query?, body? }` only, and cancellation is listed
out of scope in the README. A seam that must bound a request (abort a slow
upstream after N ms) cannot express it through `requestJson`/`requestText` and
must stay on raw `fetch` with its own `AbortController`.

**Request:** a `timeoutMs` and/or `signal` (`AbortSignal`) option on
`RequestOptions`, or an ACL-level timeout wrapper.

## 5. No multipart request body and no binary response-body reader (medium)

`RequestOptions.body` is text-only (`SoftStr`), with no `FormData`/multipart
encoder, and the response helpers surface text (`decodeJsonBody`, `requestText`);
although `ResponseBody` models `Bytes`, there is no typed way to read a binary
response body. A seam that must POST `multipart/form-data` and/or read a binary
response (audio, images, octet-stream) cannot be expressed and must stay on raw
`fetch`.

**Request:** a multipart/form-data request-body builder and a typed binary
response-body reader.

## Policies

- **workaholic:implementation** (anti-corruption-structure) — the point of a
  typed transport is that every outbound call sits behind one ACL; each missing
  capability forces a seam back to a raw/vendor path, eroding that boundary.
- **workaholic:design** (vendor-neutrality) — signing/OAuth helpers let all
  providers sit behind the same transport rather than privileging SDK-shipped
  ones.

## Quality Gate

- A seam requiring AWS SigV4 or GCP OAuth can issue a signed request through
  `plgg-fetch` with no vendor SDK; a streaming response can be read incrementally.
- A request can carry `timeoutMs`/`signal` and aborts as specified.
- A `multipart/form-data` upload and a binary response body can both be expressed
  and read through `plgg-fetch` types (no raw `fetch` fallback needed).
