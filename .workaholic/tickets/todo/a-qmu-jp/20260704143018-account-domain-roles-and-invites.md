---
created_at: 2026-07-04T14:30:18+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, DB]
effort:
commit_hash:
category:
depends_on: [20260704143031-durable-core-sacrificial-shell-boundary.md]
---

# Account domain above plgg-auth: WebCrypto password accounts, revocable admin/guest membership, single-use copy-paste invites

## Overview

Phase 6 (Auth & admin), ticket **18** of the plggpress/plggmatic roadmap —
the identity substrate the two later phase-6 tickets stand on (ticket 19
`plggpress-oidc-rp-integration`, ticket 20 `admin-ui-on-scheduler`).
Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

This ticket implements **D7** verbatim: *"Accounts/roles/invites — New
account domain above plgg-auth (exact package placement decided in its design
ticket); roles as an app-side membership table keyed by Subject (instantly
revocable); invites as copy-paste links generated in the admin UI — no
SMTP."* It exists because of **D6**: *"plggpress consumes plgg-auth as a real
OIDC OP (self-hosted IdP, OP+RP dogfooding). Chosen over a lighter session
layer. This makes MCP-over-HTTP authorization and API-token issuance standard
OAuth flows."* An OIDC Provider authenticates nobody by itself — plgg-auth's
`completeAuthorization` is an **intentionally-empty login seam** whose
docstring reads *"After the application authenticates the end-user however it
likes, it calls this with the pending request id and the resulting Subject …
The provider never sees a password."*
(`packages/plgg-auth/src/Oidc/usecase/completeAuthorization.ts`). D7 is what
fills that seam: an account domain that turns a username+password into a
verified `Subject`, decides via a membership table whether that Subject may
act as `admin` or `guest`, and lets an admin mint single-use invite links that
provision new guest accounts — all with zero new dependencies and no mailer.

Scope of THIS ticket (siblings cover the rest — do not build the HTTP login
route, cookie plumbing, or admin UI here; those are tickets 19/20):

1. **Placement decision first (D7's explicit "decided in its design
   ticket").** Design Step 1 records, in writing, whether the account domain
   is a **new `Account` feature inside `plgg-auth`** or a **new package
   (`plgg-account`)**, with rationale. Recommended default: a new
   `packages/plgg-auth/src/Account/` feature — it reuses plgg-auth's `Db`
   seam, its `Sql/rows.ts` caster discipline, its WebCrypto usage (the whole
   Jose layer is SubtleCrypto), its `plgg-db-migration` dependency, and adds
   **no new package** to wire into the runner scripts. The new-package path is
   fully specified below as the contingency if the design chooses it.
2. **Accounts table + WebCrypto-only password hashing.** An `accounts` row
   keyed by the OIDC `Subject`, carrying a username and a password hash
   produced by **PBKDF2-HMAC-SHA-256 via `crypto.subtle`** (see the algorithm
   note under Considerations — WebCrypto's SubtleCrypto exposes PBKDF2 but
   NOT scrypt, so PBKDF2 is the WebCrypto-only choice D7 leaves open; record
   this). Zero dependencies, zero native bindings.
3. **The login seam, wired.** An `authenticate(username, password)` usecase
   that folds to `Result<Option<Subject>, …>` — the value an app-owned login
   route feeds into `completeAuthorization(config)(pendingId, subject)`.
   plgg-auth's seam is not modified; the account domain sits *above* it.
4. **Roles as an instantly-revocable membership table** keyed by `Subject`,
   values a closed union `admin | guest`. Revoking a role is one `DELETE`; the
   account survives, the authority does not.
5. **Invite tokens.** Admin-generated single-use copy-paste links with an
   expiry. The token is a CSPRNG opaque string shown once; only its **hash**
   is stored (bearer-secret hygiene, exactly as refresh tokens are handled).
   Redemption creates a `guest` account + membership and burns the invite in
   one transaction. No SMTP, no mailer, no email column.

Hard constraint carried from plgg-auth's persistence contract: **`take*`
operations are get-AND-delete in ONE `Db` transaction** — the AuthStore
docstring makes single-use semantics *"live in the store contract, not in
handler sequencing"* (`Oidc/model/AuthStore.ts`), and the plgg-sql driver
implements it with `db.begin()`/`db.run(delete)`/`db.commit()` wrapped in
try/rollback (`Sql/sqlStore.ts` `takeFrom`). Invite redemption is a `take*`:
it MUST run its SELECT+DELETE (or status transition) inside one transaction so
a token can never be redeemed twice under a race.

**Coverage (D14):** *"New packages gated ≥90 from day one."* Whether this
lands as a new feature in plgg-auth (already gated) or a new `plgg-account`
package, every new module ships spec'd above 90 across
statements/branches/functions/lines from the first commit.

## Policies

- `workaholic:design` / `policies/security.md` — the policy snapshot states
  *"No role-based or attribute-based access control exists. The project is a
  library with no server, no user database, and no permission model"* and
  *"No session management … these are not applicable to a library with no
  user session concept."* This ticket introduces the project's **first**
  RBAC model and its **first** at-rest credential store, so it is the ticket
  that moves those lines. The policy's Authentication section documents the
  existing discipline this must extend: secrets never in URLs, typed
  `Result` failures not throws, no secret logging. Password hashes and invite
  tokens are the new secrets-at-rest surface; hashing is WebCrypto PBKDF2 with
  a per-account random salt, invite tokens are stored hashed, and neither a
  plaintext password nor a plaintext invite token is ever persisted, logged,
  or returned in an error message. Authorization boundary tests
  (anonymous/guest/admin) are the phase-6 gate (roadmap "Phase 6:
  authorization-boundary tests … on every admin/API route; CSRF coverage") —
  this ticket supplies the pure `roleOf`/membership predicates those route
  tests will assert against.
- `workaholic:implementation` / `policies/quality.md` — TypeScript strict
  mode is the sole static-analysis layer and `as`/`any`/`ts-ignore` are
  prohibited. The `Role` union (`admin | guest`), the invite/account decode
  casters, and the store seam are closed discriminated unions consumed with
  exhaustive `match`, so an unhandled role or a mis-shaped row is a `tsc`
  error, not a runtime surprise. This is load-bearing for a security domain:
  the no-escape-hatch rule is what makes "a shape mismatch reads as absent,
  not a throw" (the `Sql/rows.ts` idiom) provably total. Prettier
  `printWidth: 50` governs every touched `.ts` file.
- `workaholic:implementation` / `policies/test.md` — coverage is gated per
  package; plgg-auth already carries the >90 threshold enforced by
  `scripts/test-plgg-auth.sh` (fused `tsc --noEmit && plgg-test`). Every new
  Account module arrives with a colocated `.spec.ts` (flat `test()`, absolute
  imports, no `describe`). Security-critical branches — wrong password,
  expired invite, double redemption under a simulated concurrent take,
  revoked role, unknown username — are exactly the branches coverage must
  force, so they are enumerated as required specs, not left to line-count
  luck. The pure hashing/verification and membership predicates are DOM-free
  and driver-agnostic (tested over the in-memory store), keeping the number
  honest.

## Key Files

**The seam being filled (read, not modified):**

- `packages/plgg-auth/src/Oidc/usecase/completeAuthorization.ts` — the
  app-facing login seam: `(config) => (pendingId, subject) => async () =>
  Result<AuthorizationGranted, OidcError>`. Its docstring ("the provider never
  sees a password") is the contract this ticket honors; `authenticate` sits
  in front of it and yields the `Subject` it consumes.
- `packages/plgg-auth/src/Oidc/model/Tokens.ts` — `Subject`
  (`Box<"Subject", string>`, non-empty) is the join key for accounts and
  memberships; `freshOpaque()` (32 CSPRNG bytes → 43 base64url chars via
  `crypto.getRandomValues`) is the exact entropy pattern the invite-token and
  fresh-subject generators must reuse (RFC 6749 §10.10 floor).

**The persistence discipline being mirrored (read):**

- `packages/plgg-auth/src/Oidc/model/AuthStore.ts` — the seam-as-a-type
  precedent (`AuthStore`) and `liftStore` (folds a rejected promise into a
  value-level error). The `AccountStore` seam is authored in this shape; its
  redemption `take*` obeys the same "single-use lives in the store contract"
  rule.
- `packages/plgg-auth/src/Sql/sqlStore.ts` — the plgg-sql-backed `AuthStore`
  driver; `takeFrom` (SELECT+DELETE in one `db.begin/commit/rollback`) is the
  literal template for atomic invite redemption; `AUTH_TABLES` is the
  table-name-constant precedent.
- `packages/plgg-auth/src/Sql/rows.ts` — the row-caster idiom
  (`cast(row, asRawObj, forProp(...))`, `asOptField`, `hasField` reading an
  own-property descriptor's `unknown` value with no `as`). Every account /
  membership / invite decoder follows it: a mis-shaped row reads as `None`.
- `packages/plgg-auth/src/Sql/sqlStore.spec.ts` — sets its schema up by
  feeding `CREATE TABLE` strings to `db.execScript` in the spec; the account
  schema tests do the same (see Implementation Step 6).

**WebCrypto precedent to reuse (read):**

- `packages/plgg-auth/src/Jose/usecase/signJws.ts`,
  `packages/plgg-auth/src/Jose/usecase/generateRsaKey.ts` — how the codebase
  calls `crypto.subtle` (`importKey`/`sign`/`generateKey`) and folds the
  Promise through the `Result`/`proc` channel without a throw escaping.
- `packages/plgg-auth/src/Jose/model/Base64Url.ts` — `encodeBase64Url` /
  `base64UrlString` for encoding the PBKDF2 salt and derived key and the
  invite-token hash at rest (no new base64 code).

**The Db seam (read):**

- `packages/plgg-sql/src/Db/model/Db.ts` — `Db` (`all`/`run`/`execScript`/
  `begin`/`commit`/`rollback`) and `ExecResult`; `execScript`'s docstring
  ("developer-authored scripts only … NEVER carry user input") governs how
  the schema DDL is applied.
- `packages/plgg-auth/src/Oidc/testkit/memoryStore.ts`,
  `packages/plgg-auth/src/Oidc/testkit/sqliteDb.ts` — the in-memory store and
  `node:sqlite`-backed `Db` testkits; the account domain adds an in-memory
  `AccountStore` testkit beside them and reuses `sqliteDb` for the driver
  contract spec.

**Files created (recommended in-plgg-auth placement):**

- `packages/plgg-auth/src/Account/model/Account.ts` — `Account`
  (`subject`, `username`, `passwordHash`), the `Username` brand, and
  `PasswordHash` (opaque encoded string).
- `packages/plgg-auth/src/Account/model/Role.ts` — the closed
  `Role = "admin" | "guest"` union + `asRole` caster + exhaustive matcher.
- `packages/plgg-auth/src/Account/model/Invite.ts` — `Invite`
  (hashed token, granted role, `expiresAt`) and `InviteToken` (the shown-once
  plaintext, branded).
- `packages/plgg-auth/src/Account/model/AccountStore.ts` — the persistence
  seam (below).
- `packages/plgg-auth/src/Account/usecase/hashPassword.ts`,
  `.../verifyPassword.ts` — WebCrypto PBKDF2 derive + constant-time verify.
- `packages/plgg-auth/src/Account/usecase/authenticate.ts` — username+password
  → `Result<Option<Subject>, …>` (the seam feeder).
- `packages/plgg-auth/src/Account/usecase/roleOf.ts`,
  `.../grantRole.ts`, `.../revokeRole.ts` — membership predicates + mutations.
- `packages/plgg-auth/src/Account/usecase/createInvite.ts`,
  `.../redeemInvite.ts` — invite mint (returns plaintext once) + atomic redeem.
- `packages/plgg-auth/src/Account/Sql/accountStore.ts`,
  `.../accountRows.ts` — the plgg-sql-backed `AccountStore` + row casters.
- `packages/plgg-auth/src/Account/Sql/schema.ts` — the `CREATE TABLE` DDL
  constants (`accounts`, `account_roles`, `account_invites`) applied via
  `execScript`.
- `packages/plgg-auth/src/Account/testkit/memoryAccountStore.ts` — in-memory
  driver for pure-usecase specs.
- `packages/plgg-auth/src/Account/index.ts` — feature barrel; wired into
  `packages/plgg-auth/src/index.ts` (which today does `export * from
  "plgg-auth/Jose|Oidc|Sql"`).
- Colocated `.spec.ts` beside every module above.

**Wiring (verify — the in-plgg-auth path touches NO runner script):**

- `scripts/build.sh` (plgg-auth at line 56, comment lines 54–55),
  `scripts/npm-install.sh` (line 25), `scripts/check-all.sh`
  (`./scripts/test-plgg-auth.sh` at line 44) — plgg-auth is already wired; the
  in-plgg-auth placement changes none of them. **Contingency (new
  `plgg-account` package only):** add the exact `cd $REPO_ROOT/packages/
  plgg-account && npm run build` line to `build.sh` after `plgg-sql`/
  `plgg-db-migration` (publish order is sed-derived from this line format —
  keep it byte-exact), a matching `npm install` line to `npm-install.sh`, a
  `test-plgg-account.sh` invocation to `check-all.sh`, and the per-package
  scripts + `plgg-test.config.json` (threshold 90).

- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the decision
  record; `.workaholic/policies/security.md` — the policy this ticket updates
  the reality behind.

## Related History

The account domain is the fourth stratum on a three-stratum foundation built
in one recent branch:

- `.workaholic/tickets/archive/work-20260703-220007/20260703222252-plgg-auth-jose-layer.md`
  — the JOSE layer (base64url, JWK/JWKS, JWS RS256, JWT) entirely on
  WebCrypto. Establishes the `crypto.subtle`-through-`Result` house pattern
  the password hasher reuses verbatim; there is no third-party crypto and none
  is added here.
- `.workaholic/tickets/archive/work-20260703-220007/20260703222254-plgg-auth-oidc-provider-core.md`
  — the OIDC OP core, including `completeAuthorization` as the deliberately
  app-owned login seam. This ticket is the "however it likes" the seam's
  docstring defers to. The provider stays password-blind; the account domain
  is the thing that holds passwords.
- `.workaholic/tickets/archive/work-20260703-220007/20260703222255-plgg-auth-persistence-and-hardening.md`
  — the plgg-sql `AuthStore` driver, atomic `take*` (`takeFrom`), row casters,
  and refresh-token hashing-at-rest. Every persistence pattern this ticket
  needs already exists here; invite tokens copy the refresh-token
  hash-not-plaintext discipline, and redemption copies `takeFrom` for
  single-use atomicity. Story: `.workaholic/stories/work-20260703-220007.md`.
- `.workaholic/tickets/archive/work-20260703-220007/20260703222253-plgg-http-cookies-and-form-decoding.md`
  — cookies + form decoding, the machinery a login/redeem HTTP route needs.
  Deliberately NOT consumed here: this ticket ships pure domain + store; the
  route wiring is ticket 19/20's job (the seam stays testable headlessly).
- `.workaholic/tickets/archive/work-20260704-022023/20260704020526-fix-plgg-auth-ci-garbage-key-tests.md`
  — hardened the auth suite against CI-only crypto flakes; a reminder that
  WebCrypto specs must be deterministic (fixed salts/iteration counts in
  vectors, not ambient randomness) to stay green in clean-runner CI.
- Downstream in this queue: ticket 19 (`plggpress-oidc-rp-integration`)
  mounts the OP + the login route that calls `authenticate` →
  `completeAuthorization`; ticket 20 (`admin-ui-on-scheduler`) renders the
  invite-generation and role-management UI on the phase-4 scheduler. Both
  depend on the seams this ticket defines — keep those seams UI-agnostic.

## Implementation Steps

1. **Design step (mandatory, before any `src/` edit) — record the D7
   placement decision.** Write a short design note (in the PR description or a
   `.workaholic/specs/` sketch) that: (a) chooses **Account-feature-inside-
   plgg-auth** vs **new `plgg-account` package** and states why (recommended:
   in-plgg-auth — reuses `Db`/casters/WebCrypto/`plgg-db-migration`, adds no
   runner-script surface, and the OP is the only consumer so there is no
   packaging benefit to separation); (b) fixes the **password KDF** as
   PBKDF2-HMAC-SHA-256 (WebCrypto SubtleCrypto has no scrypt — see
   Considerations) with a chosen iteration count and a per-account 16-byte
   CSPRNG salt, and the encoded-hash string format; (c) fixes the **invite
   token** as a `freshOpaque()`-style CSPRNG string, stored as its SHA-256
   hash (`crypto.subtle.digest`), shown to the admin exactly once; (d)
   confirms redemption is a single-transaction `take*`. Present at the drive
   approval gate; implement only after agreement. If the design says
   new-package, the contingency wiring in Key Files becomes mandatory.
2. **Models.** `Role.ts`: `export type Role = "admin" | "guest"` with `asRole`
   (err on anything else) and a `matchRole` exhaustive helper. `Account.ts`:
   `Username` brand (non-empty, normalized — trim + case-fold decision
   recorded), `PasswordHash` brand over the encoded string, `Account`
   (`subject: Subject`, `username: Username`, `passwordHash: PasswordHash`).
   `Invite.ts`: `InviteToken` (branded plaintext, shown once), `InviteHash`
   (branded stored hash), `Invite` (`hash: InviteHash`, `role: Role`,
   `expiresAt: Num`). All pure data; construction performs nothing.
3. **WebCrypto password hashing** (`hashPassword.ts`/`verifyPassword.ts`).
   `hashPassword(plain)`: generate a 16-byte salt via
   `crypto.getRandomValues`; `crypto.subtle.importKey("raw", utf8(plain),
   "PBKDF2", false, ["deriveBits"])`; `crypto.subtle.deriveBits({ name:
   "PBKDF2", salt, iterations: <chosen>, hash: "SHA-256" }, key, 256)`; encode
   as a self-describing string `pbkdf2$sha256$<iterations>$<salt-b64url>$
   <derived-b64url>` (reusing `encodeBase64Url`). `verifyPassword(plain,
   hash)`: parse the stored string, re-derive with the parsed params, compare
   the derived bytes to the stored bytes in **constant time** (XOR-accumulate
   over the two `Uint8Array`s; equal length checked first) — do NOT use `===`
   on the base64 strings. Every SubtleCrypto call is folded to a `Result` via
   the Jose-layer pattern (`foldThrown`/`proc`), never a bare `await` that can
   throw. No plaintext is retained after derivation.
4. **`authenticate.ts`.** `authenticate(store)(username, password) =>
   Promise<Result<Option<Subject>, …>>`: look the account up by username
   (mis-shaped/absent row → `None`), `verifyPassword` against the stored hash,
   return `some(account.subject)` only on a verified match, `none()` on
   unknown-user OR wrong-password (same outward result — no username
   enumeration oracle; record this). This is the value the app-owned login
   route hands to `completeAuthorization`; plgg-auth's seam is untouched.
5. **Membership.** `roleOf(store)(subject) => Promise<Option<Role>>` reads the
   `account_roles` row; `grantRole(store)(subject, role)` upserts;
   `revokeRole(store)(subject)` deletes the row (instant revocation — the
   account persists). `roleOf` is the pure predicate ticket 20's
   authorization-boundary route tests assert against, so keep it store-driven
   and side-effect-free on read.
6. **`AccountStore` seam + drivers + schema.** In
   `Account/model/AccountStore.ts` declare the seam
   (`findAccountByUsername`, `saveAccount`, `roleOf`, `setRole`, `clearRole`,
   `saveInvite`, `takeInvite`) — all `Promise`-returning, in the `AuthStore`
   shape, with the SAME "`take*` is get-AND-delete" contract for `takeInvite`.
   In `Account/Sql/accountStore.ts` implement it over `Db`, binding every
   value through the injection-safe `sql` template and decoding rows with
   `accountRows.ts` casters (mirror `Sql/rows.ts`); `takeInvite` copies
   `takeFrom`'s `begin`/`run(delete)`/`commit`/rollback exactly. In
   `Account/Sql/schema.ts` export the DDL constants — `accounts (subject TEXT
   PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
   created_at INTEGER NOT NULL)`, `account_roles (subject TEXT PRIMARY KEY,
   role TEXT NOT NULL)`, `account_invites (token_hash TEXT PRIMARY KEY, role
   TEXT NOT NULL, expires_at INTEGER NOT NULL)` — applied via `execScript`
   (developer-authored DDL, never user input). Add
   `testkit/memoryAccountStore.ts` for the pure usecase specs. (If
   `plgg-db-migration`'s apply engine is preferred over raw `execScript`,
   note that its `apply`/`rollback` "land in later tickets" per its barrel —
   ship the schema as `execScript` constants now, reusable as a migration
   body later.)
7. **Invites.** `createInvite(store, clock)(role, ttlSeconds) =>
   Promise<Result<{ token: InviteToken; invite: Invite }, …>>`: mint a
   `freshOpaque()`-style token, store only its SHA-256 hash + role +
   `clock() + ttl`, return the plaintext token ONCE (the admin copies the
   link — the link is a client concern for ticket 20). `redeemInvite(store,
   clock)(token, username, password) => Promise<Result<Subject, …>>`:
   `takeInvite(hash(token))` inside one transaction; on `None` or expired →
   typed error (single outward "invalid or expired invite" message — no
   distinction that leaks whether the token existed); on a live invite, mint a
   fresh `Subject`, `hashPassword(password)`, `saveAccount`, `setRole(subject,
   invite.role)` (always `guest` today, but carried as the invite's role for
   forward flexibility), and return the new `Subject`. Redemption's
   single-transaction take is the double-redeem guard.
8. **Barrels.** Export the models, usecases, store seam, drivers, and schema
   from `Account/index.ts`; add `export * from "plgg-auth/Account"` to
   `packages/plgg-auth/src/index.ts`.
9. **Specs (one per module, plgg-test, colocated, flat `test()`):** password
   round-trip (hash→verify true; wrong password false; tampered stored string
   → typed err not throw; verify is constant-time-shaped — no early `return`
   on first mismatch); `authenticate` unknown-user and wrong-password both
   yield `none()`; `roleOf`/`grant`/`revoke` (revoke leaves the account,
   removes the role); `createInvite` returns plaintext once and stores only
   the hash (assert the plaintext is absent from the stored row); expired
   invite rejected; **double-redemption**: two `redeemInvite` calls on one
   token — exactly one succeeds (drive both against the sqlite `Db` testkit to
   exercise the real transaction, and/or a contract spec like
   `Sql/contract.spec.ts`); a driver contract spec running the seam over both
   the in-memory testkit and `sqliteDb` (schema applied via `execScript`).
   Use fixed salts/iterations in vectors for determinism (clean-runner CI).
10. **House rules end to end:** no `as`/`any`/`ts-ignore`; Option not
    null/undefined, Result not throw, exhaustive `match` over `Role` and every
    new union; data-last pipelines (`pipe`/`cast`/`proc`); Prettier
    `printWidth: 50`; zero new dependencies; no native bindings. Verify the
    runner scripts need no edit (in-plgg-auth path) or apply the exact
    contingency wiring (new-package path).

## Quality Gate

**Acceptance criteria**

1. The D7 placement decision is recorded with rationale before
   implementation, and the KDF/invite-token/atomicity decisions from Design
   Step 1 are fixed in writing.
2. `accounts`, `account_roles`, `account_invites` exist as schema DDL applied
   through `execScript`; every value written by the driver is `sql`-bound
   (no string interpolation of user input into SQL).
3. Passwords are hashed with **WebCrypto PBKDF2-HMAC-SHA-256** (a per-account
   CSPRNG salt, the chosen iteration count), stored as the self-describing
   encoded string, verified in constant time; **no plaintext password is ever
   stored, logged, or returned**. Zero new dependencies; no native bindings;
   no `node:crypto` scrypt.
4. `authenticate(store)(username, password)` yields `some(subject)` only on a
   verified match and `none()` for BOTH unknown-user and wrong-password; its
   `Subject` is exactly what `completeAuthorization` consumes, and
   `packages/plgg-auth/src/Oidc/usecase/completeAuthorization.ts` is
   unmodified.
5. Roles are a closed `admin | guest` union; `roleOf` reads membership,
   `revokeRole` is a single `DELETE` that leaves the account intact
   (spec-proven instant revocation).
6. Invite tokens are CSPRNG, stored **only as a hash**, shown once; redemption
   is a single-transaction `take*` that creates a `guest` account + membership
   and **cannot succeed twice** (double-redeem spec passes); expired invites
   are rejected; no SMTP/mailer/email surface exists anywhere in the diff.
7. `git diff --stat` adds only the Account modules/specs (+ the plgg-auth
   index barrel), touches no runner script on the in-plgg-auth path (or
   applies the exact contingency wiring on the new-package path), and adds no
   dependency to any `package.json`.

**Verification method**

`scripts/tsc-plgg.sh` clean; `./scripts/test-plgg-auth.sh` green (or
`./scripts/test-plgg-account.sh` on the new-package path); then a **fresh**
`scripts/check-all.sh` (clean rebuild — stale dists must not mask drift) green
end to end, with the owning package above the >90 threshold across
statements/branches/functions/lines including every new module. Prove secret
hygiene by grepping the code and a written test-DB row: the stored
`password_hash` and `token_hash` are hashes, and no plaintext password/token
appears. Paste the double-redemption spec result and `git diff --stat`.

**Gate**

All seven acceptance criteria hold objectively AND the fresh `check-all.sh` is
green AND coverage stays >90. A stored plaintext password or invite token, a
non-constant-time verify, a redemption that can double-succeed, a modified
`completeAuthorization`, a username-enumeration oracle, an escape hatch
(`as`/`any`/`ts-ignore`), a new dependency, or a coverage dip fails the ticket.

## Considerations

- **PBKDF2, not scrypt — WebCrypto constraint.** D7 says "PBKDF2 or scrypt via
  SubtleCrypto"; SubtleCrypto (`crypto.subtle`) implements **PBKDF2 only** —
  scrypt exists solely in `node:crypto` (`crypto.scrypt`), which is a Node
  binding, not WebCrypto, and would violate the WebCrypto-only + portability
  intent. PBKDF2-HMAC-SHA-256 is therefore the choice; pick an iteration count
  in the current OWASP-recommended range and encode it in the hash string so
  it can be raised later without a migration. Record this in Design Step 1.
- **Constant-time compare, hand-rolled.** `node:crypto.timingSafeEqual` is a
  Node binding; to stay WebCrypto-portable, `verifyPassword` compares derived
  bytes with an XOR-accumulate loop after a length check. Spec its shape
  (no early return on first differing byte).
- **No username-enumeration oracle.** `authenticate` and `redeemInvite` return
  the same outward failure whether the identifier was unknown or the secret
  wrong; the security-policy Authentication section's discipline extends here.
- **Invite role is carried, not hardcoded at the schema.** Today only `guest`
  invites are minted (D7), but `account_invites.role` stores the granted role
  so an `admin`-invite is a data change, not a schema change, when a future
  ticket wants it — without widening scope now.
- **Deferred to later phase-6 tickets (do NOT build here):** the HTTP login
  route, session cookie issuance, CSRF tokens, and the copy-paste-link UI
  belong to ticket 19/20; this ticket stops at pure domain + store seams so
  they stay headlessly testable. The authorization-boundary and CSRF gates
  (roadmap phase-6) are exercised there, against the `roleOf` predicate
  defined here.
- **Expiry sweeping / cleanup** of stale unredeemed invites and expired
  sessions is an operations concern (roadmap ticket 28); `redeemInvite`
  already rejects an expired invite at read time, so correctness does not
  depend on a sweeper — record a follow-up, don't build a cron here.
- **Password reset / rotation, lockout/rate-limiting, and second factors** are
  out of scope; the iteration-count-in-hash format leaves room for a rehash-
  on-login upgrade path, and rate-limiting is a route concern for ticket 19.
- **Revisit trigger:** if a second consumer beyond the OP needs accounts,
  re-open the D7 placement decision (extract `plgg-account`); until then the
  in-plgg-auth feature is the zero-new-package default. When D4's guest web
  editing ships, revisit whether accounts should move to SQLite-primary
  alongside content (D4 revisit trigger).
