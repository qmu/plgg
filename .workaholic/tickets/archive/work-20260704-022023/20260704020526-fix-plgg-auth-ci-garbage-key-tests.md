---
created_at: 2026-07-04T02:05:26+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort: 1h
commit_hash: cfa33af
category: Changed
depends_on:
---

# Fix two runtime-fragile plgg-auth crypto tests that fail CI (main is RED), then finish the PR #54 ship

## Overview

**Resumption ticket (context handoff).** PR #54 (the four-phase plgg-auth OIDC
provider) was **merged to `main`** by the developer (merge commit `ce3d460`),
but the `Run Tests` CI workflow — the fresh-clone `scripts/check-all.sh`
backstop — **failed on `main`**, so `main` is currently red. Two plgg-auth
tests pass locally (Node 24.13.1 on this host) but fail on the GitHub Actions
ubuntu runner (also Node 24, different OpenSSL build): they assert a specific
error from a **deliberately-garbage RSA JWK**, and the CI runtime's WebCrypto
*accepts* the degenerate key and signs successfully instead of rejecting it.

The `Deploy Guide` workflow **succeeded** on the merge, so the docs site is
fine. The post-merge ship steps (**GitHub Release + `./scripts/publish-npm.sh`
publishing plgg-auth@0.0.1 and the bumped plgg-http/server/db-migration/test**)
were **never run** — they are gated behind a green ship and must wait until
`main` is green again.

Do this on a **new** work branch (`main` is merged; never reopen the old
branch). Then re-run `/ship` (or the post-merge publish steps) once `main` is
green.

## The two failing tests

CI output (run 28673940317, push to `main` at `ce3d460`):

```
✗ garbage private key material folds to SignFailure
    • expected Err, got { __tag: "Ok", content: { __tag: "CompactJws", ... } }
✗ a broken signing key makes issuance a ServerError
    • expected Err, got { __tag: "Ok", content: { accessToken, idToken, refreshToken, expiresIn } }
215 passed, 2 failed, 0 skipped
```

Both feed a structurally-branded but cryptographically-degenerate RSA private
JWK (`n: "AA"`, `d/p/q/dp/dq/qi: "AA"`) to `signJws` and expect
`crypto.subtle.sign` to reject:

1. `packages/plgg-auth/src/Jose/usecase/signJws.spec.ts` (~line 55) —
   `"garbage private key material folds to SignFailure"`: expects
   `Err(SignFailure)`.
2. `packages/plgg-auth/src/Oidc/usecase/coverageGaps.spec.ts` (~line 380) —
   `"a broken signing key makes issuance a ServerError"`: the same garbage key
   as the store's active signing key; expects the token exchange to return
   `Err(ServerError)` (issuance folds an id-token sign failure to
   `serverError`).

On this host `crypto.subtle.sign` throws on the tiny modulus (→ `SignFailure`,
→ `ServerError`); on the CI runner it returns a signature, so both `expected
Err` assertions fail. This is the known "Node's WebCrypto validates RSA key
material lazily and inconsistently across builds" gotcha (recorded in the
phase-1/3 ticket Final Reports) — the garbage-key trick is **not** a
runtime-portable way to force a signing failure.

## Why these tests exist

They exist **only for branch coverage** of two defensive arms:
- `signJws`'s `liftJose("SignFailure")` reject path (`packages/plgg-auth/src/Jose/usecase/signJws.ts`).
- `issueTokensFor`'s `isErr(idToken) → serverError(...)` path (`packages/plgg-auth/src/Oidc/usecase/issueTokens.ts`).

The plgg-auth coverage gate is **>91% on all four metrics** (per-package
`plgg-test.config.json` threshold 91). Any fix MUST keep those two branches
covered, or the coverage gate goes red — re-verify with `npm run coverage`.

## Key Files

- `packages/plgg-auth/src/Jose/usecase/signJws.spec.ts` — failing test 1 (garbage-key → SignFailure)
- `packages/plgg-auth/src/Oidc/usecase/coverageGaps.spec.ts` — failing test 2 (garbage-key → ServerError)
- `packages/plgg-auth/src/Jose/usecase/signJws.ts` — the `SignFailure` branch under test
- `packages/plgg-auth/src/Oidc/usecase/issueTokens.ts` — the `ServerError` branch under test
- `packages/plgg-auth/src/Jose/usecase/importRsaKey.ts` — how keys are imported (`["sign"]` usages)
- `packages/plgg-auth/plgg-test.config.json` — the coverage threshold (91)
- `scripts/check-all.sh` — the CI gate that must pass in a fresh clone

## Implementation Steps

1. Reproduce the way CI sees it (a clean checkout, not the warm worktree). The
   failure is runtime/clean-clone specific — a plain `npm run coverage` on this
   host is green, so DO NOT trust local green alone; reason about what
   `crypto.subtle.sign` guarantees across builds.
2. Replace the garbage-key trigger with a **deterministic, runtime-portable**
   way to force `crypto.subtle.sign` to reject, so both branches stay covered
   on every runtime. Candidate approaches to evaluate (pick the simplest that
   is guaranteed):
   - **Wrong key usage (most portable):** `crypto.subtle.sign` throws
     `InvalidAccessError` on **every** runtime when the `CryptoKey` lacks the
     `"sign"` usage. Currently `importSignKey` imports with `["sign"]`; expose a
     seam (or a testkit-only import with `["verify"]`) so a spec can drive a
     verify-only key into the sign path deterministically. This is the cleanest
     guaranteed failure.
   - **Structurally-invalid JWK that fails at import on all builds** — verify it
     actually throws in CI, not just locally (the current approach proves it may
     not).
   - If neither can be made portable, cover the two branches by injecting a
     failing crypto step at a seam (a test-only `sign` that rejects) rather than
     relying on real-crypto behavior of a bad key.
3. Keep BOTH branches (`SignFailure` in `signJws.ts`, `ServerError` in
   `issueTokens.ts`) covered; do not simply delete the tests unless the branch
   is otherwise exercised.
4. `npx prettier --write`, `scripts/tsc-plgg.sh` clean, no `as`/`any`/`ts-ignore`.
5. Commit on a new `work-YYYYMMDD-HHMMSS` branch, open a PR, and land it so
   `main`'s `Run Tests` goes green.
6. **Finish the interrupted PR #54 ship** once `main` is green: the GitHub
   Release (CalVer tag) and `./scripts/publish-npm.sh` (publishes
   plgg-auth@0.0.1 new, plgg-http@0.0.2, plgg-server@0.0.3,
   plgg-db-migration@0.0.2, plgg-test@0.0.3 — **irreversible**, confirm with the
   developer first) were never run. The versions are already bumped and on
   `main`. Run the post-merge publish per `.workaholic/deployments/npm.md` and
   `release.md`, or re-run `/ship`.

## Quality Gate

**Acceptance criteria:**

- Both previously-failing tests pass in a **fresh clone** (the failure mode),
  not just the warm worktree — the fix must be runtime-portable (works whether
  or not the local `crypto.subtle.sign` rejects a degenerate key).
- `crypto.subtle.sign`'s rejection is forced deterministically (e.g. missing
  `"sign"` usage), not by relying on a runtime rejecting garbage key material.
- plgg-auth coverage stays **>91% on all four metrics** (`npm run coverage`),
  with the `SignFailure` and `ServerError` branches still exercised.
- `scripts/check-all.sh` green on a fresh full rebuild.
- No `as`/`any`/`ts-ignore`.

**Verification:**

- `cd packages/plgg-auth && npm run coverage` green at threshold 91.
- `scripts/check-all.sh` green; then confirm the `Run Tests` CI workflow passes
  on the fix PR (this is the surface that caught it —
  `gh run list --workflow="Run Tests"`).

**Gate:** the fix PR merged with `Run Tests` green on `main`, restoring a green
`main`; then the deferred PR #54 GitHub Release + npm publish completed.

## Considerations

- The root cause is documented as a discovered insight in the phase-1 and
  phase-3 Final Reports (`.workaholic/tickets/archive/work-20260703-220007/`):
  "Node's WebCrypto validates RSA JWK material lazily — a garbage key can be
  accepted and only fails (or doesn't) at sign/verify, and the exact point
  differs across runtimes." These two tests are the exact place that bit us in
  CI (`packages/plgg-auth/src/Jose/usecase/signJws.spec.ts`,
  `packages/plgg-auth/src/Oidc/usecase/coverageGaps.spec.ts`).
- `main` is currently red on `Run Tests`; treat unblocking it as the priority
  before any further plgg-auth feature work.
- The npm publish in step 6 claims the `plgg-auth` name permanently and is
  irreversible — get explicit developer go-ahead (they were AFK when the
  original `/ship` reached that gate, and the merge itself required their manual
  approval).
- Branch coverage on plgg-auth is sensitive to `matchOption`-with-inline-arrow
  error paths (another recorded insight); if you restructure the tests, re-check
  the branch metric rather than assuming statements/lines coverage implies it.

## Final Report

Both runtime-fragile tests are now portable and green on a fresh full rebuild
(`scripts/check-all.sh` exit 0; `plgg-auth` 217 passed, coverage gate passed on
all four metrics — statements 98.76%, branches 91.21%, functions 98.44%, lines
98.76%, with `signJws.ts`, `issueTokens.ts`, and `Jwk.ts` all at 100%). The
fix replaces the degenerate-key trigger with a deterministic, spec-mandated
wrong-usage failure that does not depend on OpenSSL's lazy key-material
validation.

### What changed

- **`signJws.ts`** — extracted `signWith(key: CryptoKey)(input)`, which owns
  the `liftJose("SignFailure")` step; `signJws` now imports the JWK and
  delegates. A genuine import/sign decomposition, not a test hook.
- **Test 1** (`signJws.spec.ts`) — signs with a key imported `["verify"]`
  (`importVerifyKey(a2PublicKey)`), so `crypto.subtle.sign` throws
  `InvalidAccessError` → `SignFailure` on every runtime.
- **`Jwk.ts`** — added the optional RFC 7517 `use?: "sig" | "enc"` field to
  `RsaPrivateJwk`, emitted by `privateJwkJson` only when set (ordinary signing
  keys are unaffected).
- **Test 2** (`coverageGaps.spec.ts`) — the store's active signing key is now
  valid RFC key material declared `use: "enc"`, which WebCrypto rejects from a
  signing import (`DataError`) on every runtime → `KeyFailure` → issuance folds
  to `ServerError`.

### Discovered Insights

- **Insight**: The *only* portable way to force `crypto.subtle.sign` to fail is
  a `CryptoKey` that lacks the `"sign"` usage (or a JWK whose `use`/`key_ops`
  contradicts the requested usage) — WebCrypto checks the usage/validates the
  JWK envelope *before* touching key material, so it throws
  `InvalidAccessError`/`DataError` identically across OpenSSL builds. A
  structurally-valid-but-degenerate key (tiny modulus, all-`"AA"` CRT params)
  is *not* portable: it imports lazily and some builds (the CI ubuntu runner)
  sign it successfully. Empirically confirmed on this host: garbage key →
  import OK, sign `OperationError`; verify-only key → sign `InvalidAccessError`.
  **Context**: This is the runtime-portable replacement for the "garbage-key
  trick" the phase-1/3 reports flagged. Reach for wrong-usage (a validation
  failure), never bad-material (a crypto failure), whenever a test needs a
  deterministic WebCrypto rejection.
- **Insight**: `issueTokensFor`'s `isErr(idToken) → serverError` arm can only
  be driven portably through the store's `RsaPrivateJwk` API by a JWK the
  *import* rejects (the sign key is imported with `["sign"]` internally, so a
  verify-only `CryptoKey` can't be injected there). A `use: "enc"` key is the
  cleanest such trigger and needed only a one-field, RFC-legitimate model
  addition rather than a production test-seam.

### Deferred (out of scope)

- **PR #54 ship completion (blocking, awaiting developer go-ahead).** The
  post-merge GitHub Release (CalVer tag) and `./scripts/publish-npm.sh`
  (publishes `plgg-auth@0.0.1` new — claims the npm name **permanently and
  irreversibly** — plus `plgg-http@0.0.2`, `plgg-server@0.0.3`,
  `plgg-db-migration@0.0.2`, `plgg-test@0.0.3`) were never run and remain
  pending. They are gated behind a green `main`: land this fix PR first, then
  run the publish per `.workaholic/deployments/npm.md`/`release.md` (or re-run
  `/ship`) **only** with explicit developer confirmation.
