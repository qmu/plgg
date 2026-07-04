---
created_at: 2026-07-04T14:30:28+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260704143014-plggpress-serve-mode-dual-config.md, 20260704143019-plggpress-oidc-rp-integration.md]
---

# Operate the stateful served plggpress instance: cloudflared-fronted always-on process, SQLite WAL + single-writer policy, a backup/restore runbook proven by a drill, operator-secret at-rest posture, and a health endpoint

## Overview

Phase 11 (Rollout), ticket **28** of the plggpress/plggmatic roadmap — the
ticket that turns the served process the earlier phases built into something
that is actually *operated* in production. Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

It cashes in **D5** verbatim: *"Production topology — **Dual-mode**: public
reader stays SSG/CDN (GitHub Pages); dynamic features (/admin, API, RAG, agent)
run as a separate always-on served instance sharing one config."* Tickets 14
and 19 built the served half (the `serve` verb, the `pressServer.ts` mount seam,
the OP+RP auth boundary); **nobody has yet said how that process stays up, where
its data lives, how it is backed up, or how its secrets are held at rest.** This
ticket writes that down and makes it real, and it does so *without touching the
public reader* — the reader keeps deploying to GitHub Pages exactly as it does
today (D5's "public reader stays SSG/CDN").

Four operational facts have to become code + runbook here, because the dynamic
instance is the monorepo's first stateful, always-on, secret-holding process:

1. **Where it runs.** Behind the existing `cloudflared` tunnel (the same
   mechanism that already fronts the guide), a persistent Node process running
   `plggpress serve` (ticket 14's verb) — provisioned by the established
   `workloads/<name>/` compose precedent, **not** a bespoke pile of `scripts/`
   entries.
2. **How its data behaves.** The SQLite file the served instance owns (the OP
   `AuthStore`, the RP `rp_sessions`, and — per **D4**: *"SQLite is a derived,
   rebuildable index"* — the RAG/search/requests tables) runs in **WAL mode**
   under a **single-writer policy**: exactly one served process writes it; the
   SSG build never touches it. This must be pragma-enforced at DB-open and
   stated in prose so a second writer is never introduced by accident.
3. **How it is recovered.** A **backup/restore runbook** whose gate is an
   **actual drill** — take a consistent snapshot of a live (writer-attached) WAL
   database, mutate the data, restore, and prove the mutation is gone. The
   recovery policy today reads *"No backup scripts … not observed … No formal
   recovery plan, runbook, RTO target, or RPO target is documented"* — this
   ticket moves those lines for the served instance.
4. **How its secrets are held.** The served process holds two classes of
   secret: **LLM API keys** (plgg-kit's `Provider.apiKey`, per D11/D12 the switch
   that activates opt-in embeddings and the Realtime agent) and — flagged
   explicitly in the scope — the **plaintext private signing JWK** plgg-auth
   persists in the `private_jwk` column of its store (`SigningKeyRecord`,
   `AuthStore.activeSigningKey`). Neither is encrypted at the application layer
   today. This ticket **defines the at-rest posture** (filesystem custody +
   off-host backup access control as the boundary, plaintext-in-DB flagged as a
   deferred hardening) rather than half-building crypto.

Plus a **health endpoint** (`/healthz`) and the minimal monitoring the
observability policy says does not yet exist (*"No … health-check endpoints are
observed"*).

Hard scope fences (siblings/roadmap own the rest — do NOT build here):
- The `serve` verb, its config sharing, and the mount seam are **ticket 14** —
  consumed, not reimplemented. The health route mounts through
  `pressServer.ts`, the one composition point; it is not a new server.
- The OP+RP auth boundary, sessions, CSRF, and the `rp_sessions`/account schema
  are **ticket 19** — consumed. This ticket operates the process those routes
  run in; it does not add auth logic.
- Application-layer encryption of the signing JWK / at-rest secret encryption is
  **deferred** (a Consideration + revisit trigger), not built here.
- qmu.co.jp replacement / guide-site consolidation is **ticket 29**; RAG and the
  voice agent are tickets 24/25 — this ticket only guarantees the *operational
  substrate* they land on (a durable DB, backups, secrets, health), not their
  features.

Zero new third-party dependencies; no native bindings (`node:sqlite`, Node
≥22.6, is the accepted SQLite surface behind plgg-sql's `Db` seam; WAL and the
snapshot are plain pragmas/SQL, no `sqlite3` CLI or extension). No
`as`/`any`/`ts-ignore`; Option/Result + exhaustive `match`; Prettier
`printWidth: 50`. The public reader's GitHub Pages pipeline is untouched.

## Policies

- `workaholic:operation` / `policies/recovery.md` — this is the policy this
  ticket most directly moves. Its snapshot reads *"plgg contains no persistent
  data stores … No backup scripts, snapshot configurations, or data export
  procedures are present … No formal recovery plan, runbook, RTO target, or RPO
  target is documented … The project does not operate a production service."*
  The served instance is the first persistent store and the first operated
  service, so this ticket authors the **backup strategy** (WAL-safe snapshot),
  the **restore procedure**, and the **drill** the policy's "Gaps" section names
  as missing (Backup automation / Disaster recovery runbook / RTO-RPO /
  Rollback). The policy's discipline governs the shape: the runbook is
  executable and *proven*, not prose that rots.
- `workaholic:operation` / `policies/observability.md` — the policy states *"No
  uptime monitoring, synthetic monitoring, or health-check endpoints are
  observed … No health-check design pattern is implemented,"* and that logging is
  the native `console` API only. This ticket adds the **first health endpoint**
  and the minimal liveness/readiness signal the tunnel-fronted process needs,
  keeping logging within the existing `console`/`printPlggError` convention
  (no new logging framework — that would be a new dependency).
- `workaholic:operation` / `policies/delivery.md` — the served instance is a
  **second delivery path** for the same content next to the static one (*"the
  `deployment` job … contains only a placeholder … Deployment to environments
  other than npm … is not observed"*). This ticket provisions that path via the
  `workloads/<name>/` compose precedent already used for the guide, and must
  **not** perturb the SSG/GitHub-Pages path (D5's untouched reader). Runner
  scripts (`npm-install.sh` / `build.sh` / `check-all.sh`) are only edited if a
  new package is introduced — none is expected here (see Implementation Steps).
- `workaholic:design` / `policies/security.md` — the operator-secret at-rest
  posture is a security-design decision. The policy's discipline (secrets never
  in a URL or a log; typed failures; no default-allow) governs how the LLM keys
  and the signing JWK are held: env-injected, root-readable-only, never in the
  repo, never in a log line; the DB file that carries the plaintext `private_jwk`
  is treated as a secret artifact (filesystem custody + access-controlled
  off-host backups as the boundary), with application-layer encryption flagged as
  a deferred hardening rather than silently ignored.

## Key Files

**The deployment precedent (mirror the pattern, do not disturb it):**

- `workloads/guide/compose.yaml` — the guide's compose file: host-port →
  container-port mapping (`5181:5173`) chosen to match the cloudflared route,
  bind-mount + per-package anonymous `node_modules` volumes. The production serve
  workload copies this *shape* (a `workloads/plggpress-serve/`), but runs
  `plggpress serve` (persistent, ticket 14) instead of `plgg-bundle dev`, and
  adds a durable named volume for the SQLite file.
- `workloads/guide/Dockerfile`, `workloads/guide/dev-entrypoint.sh` — the
  build-context-is-repo-root + build-siblings-on-the-mounted-tree pattern the
  serve workload's Dockerfile/entrypoint follow; the entrypoint precedent for
  building the `file:` sibling graph in dependency order via `scripts/build.sh`.
- `scripts/serve-guide.sh` — the "launch the workload detached, resolve
  docker→podman, one command" precedent; a `serve-plggpress.sh` (if any) mirrors
  it verbatim (podman fallback, detached), but this ticket prefers keeping ops
  inside `workloads/plggpress-serve/` to honor the command-scripts consolidation
  policy — one workload dir, not a scatter of `scripts/` entries.
- `~/.cloudflared/config.yml` (outside the repo; **document, do not commit**) —
  the tunnel ingress map (`qmu-dev`, `*.qmu.dev` → local ports; e.g.
  `plgg-guide.qmu.dev → :5181`). A **new ingress hostname** for the dynamic
  instance (e.g. `plggpress.qmu.dev` / `plgg-admin.qmu.dev`) → the serve host
  port is added here operationally; the runbook records the entry, the repo does
  not carry the tunnel credentials.

**The served process + data seam (consumed / lightly extended):**

- `packages/plggpress/src/server/pressServer.ts` — ticket 14's mount seam,
  extended by ticket 19 with `/auth`+`/admin`. The **`/healthz` route mounts
  here and only here** (serve-only, like the auth routes — the SSG never emits
  it, so ticket 14's byte-identity gate still holds).
- `packages/plgg-sql/src/Db/model/Db.ts` — the `Db` seam (`all`/`run`/
  `execScript`/`begin`/`commit`/`rollback`); its docstring already notes *"the
  example wires one over `node:sqlite`."* WAL pragmas and the `VACUUM INTO`
  snapshot go through `execScript`; no driver code is imported into the library.
- The plggpress DB-open bootstrap (introduced by ticket 19 to share one `Db`
  across the OP `AuthStore`, `rp_sessions`, and account domain) — the single
  place the served instance opens `node:sqlite`. WAL/`busy_timeout`/
  `foreign_keys` pragmas are applied here at open. Verify its exact path when
  ticket 19 lands; if a dedicated open module does not exist yet, add
  `packages/plggpress/src/data/openDb.ts` as the one DB-open point.

**The secrets to hold at rest (consumed — posture defined, not re-coded):**

- `packages/plgg-auth/src/Oidc/model/AuthStore.ts` — `activeSigningKey()`
  returns the private JWK new tokens are signed with; `saveSigningKey`/
  `SigningKeyRecord` persist it. The SQL store writes it to the **`private_jwk`
  column as plaintext JSON** (see `packages/plgg-auth/src/Sql/rows.spec.ts`
  around `private_jwk`), which is exactly the plaintext-JWK-at-rest exposure the
  scope flags: the DB file *is* the secret.
- `packages/plgg-kit/src/LLMs/model/Provider.ts` — `Provider.apiKey` is an
  `Option` (`None` when unconfigured — the D11/D12 graceful-degradation switch).
  The served instance supplies it from the environment; the runbook documents
  where that env value lives at rest (never the repo, never a log).

**Roadmap / policy documents this ticket updates the reality behind:**

- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` (D4/D5/D11/D12),
  `.workaholic/policies/recovery.md`, `.workaholic/policies/observability.md`,
  `.workaholic/policies/security.md`.
- `packages/plggpress/README.md`, `packages/guide/packages/plggpress.md` — the
  new "Operating the served instance" section (topology, WAL/single-writer,
  backup/restore, secrets, health).

## Related History

- `.workaholic/tickets/todo/a-qmu-jp/20260704143014-plggpress-serve-mode-dual-config.md`
  (dependency) — the `serve` verb and the `pressServer.ts` seam. Its
  Considerations explicitly hand this ticket its scope: *"Process supervision,
  TLS, ports, tunnels are out of scope — the cloudflared mapping and always-on
  operations belong to roadmap ticket 28 (production topology)."* This is that
  ticket; honor the seam (the health route mounts inside `pressServer.ts`).
- `.workaholic/tickets/todo/a-qmu-jp/20260704143019-plggpress-oidc-rp-integration.md`
  (dependency) — introduced the shared `Db`, the `rp_sessions` store, and the
  live signing-key path; its Considerations route *"rate-limiting is a
  route/operations concern for ticket 28,"* *"Session sweeping of expired
  `rp_sessions` is an operations concern (ticket 28),"* and the graceful-shutdown
  question here. Pick those up as operational items (sweep + drain), not new auth
  logic.
- `.workaholic/tickets/archive/work-20260703-050355/` and the guide-deploy
  history behind `scripts/serve-guide.sh` / `workloads/guide/*` — the precedent
  for provisioning a plggpress process behind the cloudflared tunnel via a
  `workloads/<name>/` compose bundle; the serve workload is its production
  sibling (persistent process, durable volume, no bind-mount-over-source dev
  loop).
- `.workaholic/tickets/archive/work-20260531-003055/20260610122928-plgg-server-request-dos-limits.md`
  — the node adapter's body cap and request/socket timeouts, hardened *"so it
  could face the network as an always-on process." The served instance inherits
  those defaults; this ticket is where they finally face the public tunnel.
- Concern `.workaholic/concerns/51-carried-from-pr-47-export-surface.md` — the
  bundle surface is discovered by executing the built bundle; if any operational
  module is added to plggpress, keep its barrel import+default clean and confirm
  on a fresh `check-all.sh` (clean-runner). Concern
  `.workaholic/concerns/52-degraded-window-between-cname-flip-and.md` and
  `52-https-enforcement-and-proxied-mode-follow.md` — the guide's tunnel/DNS
  cutover lessons; the new ingress hostname reuses the tunnel (no CNAME flip for
  the reader, whose GitHub Pages custom domain is untouched).
- Memory: *rm→/tmp/.trash interceptor & ENOSPC trap* — backups must land on
  **durable disk, not the 16G tmpfs**; a backup written under `/tmp` frees
  nothing and can be trashed. The runbook writes snapshots to a durable path and
  the drill verifies the file persists.

## Implementation Steps

1. **Serve workload (`workloads/plggpress-serve/`).** Mirror
   `workloads/guide/` but for the persistent instance:
   - `compose.yaml`: build context = repo root; map a host port (the one the new
     cloudflared ingress points at) → the container's serve port; a **named
     durable volume** for the SQLite file (NOT an anonymous/tmpfs volume — the
     data must survive `down`/restart); env for `DOCS_BASE`/serve flags and the
     secret env vars (see step 5). No bind-mount of the source tree (this is not
     a dev hot-reload workload).
   - `Dockerfile` + `entrypoint.sh`: build the `file:` sibling graph in
     dependency order (the `dev-entrypoint.sh` precedent, via `scripts/build.sh`),
     then `exec` `plggpress serve --port <internal>` (ticket 14's verb) — a
     persistent process, config loaded once, no watch.
   - Document (in the workload README, not in committed config) the
     `~/.cloudflared/config.yml` ingress entry to add:
     `<hostname>.qmu.dev → localhost:<host port>`. The reader's
     GitHub-Pages-backed domain is not in this map and is not touched.
2. **WAL + single-writer at DB-open.** In the plggpress DB-open bootstrap
   (ticket 19's shared `Db`, or `packages/plggpress/src/data/openDb.ts` if none),
   apply, via `Db.execScript`, immediately after opening the `node:sqlite`
   connection: `PRAGMA journal_mode=WAL;`, `PRAGMA busy_timeout=<ms>;`,
   `PRAGMA foreign_keys=ON;`, `PRAGMA synchronous=NORMAL;`. Fold the DDL through
   `runScript`/`Result` (a driver rejection → typed `SqlError`, never a throw).
   Its docstring states the **single-writer policy**: exactly one served process
   writes this file; the SSG `build` never opens it (D4 — SQLite is the derived
   index, git/filesystem is the source of truth); a second writer is a policy
   violation, not a supported topology. WAL's one-writer/many-reader model is the
   mechanism this documents, not invents.
3. **Health endpoint (`/healthz`) through the seam.** In `pressServer.ts`, add a
   serve-only, **unauthenticated**, side-effect-free `GET /healthz` (mounted in
   `pressServeWeb`, exactly where ticket 14 reserved and ticket 19 extended — the
   route never appears in SSG output, so the byte-identity gate holds). It runs a
   trivial readiness probe — a `SELECT 1` through the `Db` seam folded to a
   `Result` — and reports liveness + DB reachability + whether an active signing
   key is present (`activeSigningKey()` is `Some`) as a small JSON body, `200`
   when ready and a `503` when the DB is unreachable (exhaustive `match` on the
   probe `Result`, no default-OK branch). No secret values in the body or a log.
4. **Backup/restore runbook — the drill is the gate.** Add executable ops steps
   under `workloads/plggpress-serve/` (workload-scoped, honoring the
   command-scripts consolidation policy — not scattered `scripts/` entries):
   - `backup.sh`: take a **WAL-safe consistent snapshot of a live, writer-attached
     database** via `VACUUM INTO '<durable-path>/plggpress-<UTC-timestamp>.sqlite'`
     (a plain SQL statement — no writer stop, no extra dependency, no native
     tool), then compress; write to a **durable disk path off the tmpfs** (ENOSPC/
     trash trap) with restrictive perms (see step 5).
   - `restore.sh`: stop the served process (`compose down`), replace the volume's
     DB file with a decompressed snapshot, restart; document the ordering (never
     swap the file under a live writer).
   - Runbook prose (workload README): RPO = last snapshot; RTO = restart time;
     retention; where snapshots live; who can read them.
5. **Operator-secret at-rest posture.** Define, in the runbook + `pressAuth`/DB
   docstrings:
   - **LLM API keys** (plgg-kit `Provider.apiKey`): injected from the environment
     at process start (compose env / a root-owned `0600` env file), **never** in
     the repo, **never** logged; absent → `None` → the D11/D12 degraded path
     (FTS5-only, agent disabled). No key ever reaches `/healthz` or a log line.
   - **Signing JWK** (plgg-auth `private_jwk`, plaintext JSON in the DB): the
     **DB file is a secret artifact**. At-rest control = filesystem custody (the
     durable volume and every snapshot are `0600`, root/service-user only,
     outside any web-served tree — never in the GitHub Pages output) + access
     control on off-host backup copies. **Flag explicitly** that this is
     plaintext-at-rest with no application-layer encryption yet, and record the
     hardening (envelope-encrypt `private_jwk`, or a KMS-fronted key) as a
     deferred follow-up (Considerations) — do not half-implement crypto here.
6. **Operational follow-ups inherited from ticket 19** (small, in-scope): an
   **expired-`rp_sessions` sweep** (a periodic `DELETE ... WHERE expires_at < now`
   through the `Db` seam — correctness already holds via read-time rejection, so
   this is housekeeping, not a correctness fix) and a **graceful-shutdown drain**
   assessment on `SIGTERM`/`close` (drain in-flight auth flows before exit if node
   defaults are insufficient; if sufficient, say so). Keep both as operations, not
   new auth logic.
7. **Docs & policy reality.** Add the "Operating the served instance" section to
   `packages/plggpress/README.md` + `packages/guide/packages/plggpress.md`
   (topology diagram: reader→GitHub Pages, dynamic→tunnel→serve; WAL/single-writer;
   backup/restore; secrets; `/healthz`). Update `recovery.md` and
   `observability.md` to reflect the now-existing backup/restore runbook and
   health endpoint (the served instance moves those "not observed" lines).
8. **House rules & wiring check.** No `as`/`any`/`ts-ignore`; Option/Result +
   exhaustive `match` (the health probe and DB-open folds); data-last pipelines;
   Prettier `printWidth: 50`; zero new third-party deps; no native bindings. **No
   new package is expected** — the health route and pragmas live in existing
   plggpress/plgg-sql sources, ops live under `workloads/`. Therefore
   **`scripts/npm-install.sh` / `scripts/build.sh` / `scripts/check-all.sh` are
   not edited**; if the design step nonetheless extracts a new package, wire it
   into all three (the exact `cd $REPO_ROOT/packages/<name> && npm install` /
   `npm run build` line format, order-significant) and add its `test-`/`tsc-`
   scripts — and justify it against zero-new-package expectations.

## Quality Gate

**Acceptance criteria**

1. A `workloads/plggpress-serve/` bundle provisions the **persistent** served
   instance (`plggpress serve`, ticket 14) behind the cloudflared tunnel on a new
   ingress hostname, with a **durable named volume** for the SQLite file; the
   public reader stays on GitHub Pages and its pipeline/domain are untouched
   (`git diff` shows no change to the reader deploy path).
2. The served instance opens its SQLite DB in **WAL mode** with `busy_timeout`,
   `foreign_keys=ON`, `synchronous=NORMAL` applied at open through the `Db` seam
   (folded to `Result`, no throw); the **single-writer policy** is stated in the
   DB-open docstring and the runbook (one writer; SSG never opens the file).
3. `GET /healthz` exists, is **serve-only** (absent from SSG output — ticket 14's
   byte-identity still holds), **unauthenticated**, returns `200` with a small
   JSON liveness/readiness body when the DB probe (`SELECT 1`) succeeds and `503`
   on DB failure (exhaustive `match`, no default-OK), and **leaks no secret**.
4. A **backup/restore runbook exists and its drill passes**: `backup.sh` produces
   a consistent snapshot of a **live, writer-attached** WAL database via
   `VACUUM INTO` to a durable off-tmpfs path with `0600` perms; a drill —
   snapshot → mutate a row → `restore.sh` → the mutation is gone / prior state
   present — is executed and its evidence pasted. No writer stop is required for
   the snapshot; no new dependency / native tool is used.
5. The **operator-secret at-rest posture is written down**: LLM keys are
   env-injected, never in the repo/logs, and absent → the degraded (FTS5-only)
   path; the DB file carrying the plaintext `private_jwk` is treated as a `0600`
   secret artifact (volume + snapshots, outside any web-served tree), with
   application-layer encryption explicitly flagged as a deferred hardening.
6. The `rp_sessions` sweep and the graceful-shutdown assessment (ticket-19
   inheritances) are addressed (implemented or explicitly concluded unnecessary
   with a stated reason).
7. `git diff --stat` touches only `workloads/plggpress-serve/*`, a `/healthz`
   route + DB-open pragmas in existing plggpress/plgg-sql sources, docs, and the
   two policy files — **no new third-party dependency, no native binding, no
   runner-script edit** (unless a justified new package forced it, wired into all
   three runners), no change to `pressRouter`/`buildSpecOf`/theme, no change to
   the reader's GitHub Pages path.

**Verification method**

Health + WAL + single-writer specs (colocated, flat `test()`, absolute imports):
`/healthz` returns `200`+ready JSON on a good DB and `503` on an unreachable one
(drive via `handle(pressServeWeb(...), req)` so the real mounted stack runs);
the DB-open bootstrap reports `journal_mode=wal` after open. Backup drill:
run `workloads/plggpress-serve/backup.sh` against a seeded live DB, `UPDATE` a
row, `restore.sh`, then `SELECT` and paste the before/after showing the mutation
reverted (and that the snapshot file survived on durable disk). Suite:
`scripts/tsc-plgg.sh` clean where applicable; `./scripts/test-plggpress.sh` and
`./scripts/test-plgg-sql.sh` green; then a **fresh** `scripts/check-all.sh`
(clean rebuild — stale dists must not mask drift; also unmasks concern 51 for any
touched plggpress surface) green end to end with plggpress and plgg-sql coverage
**>90%** across statements/branches/functions/lines. Serve smoke: bring the
workload up, `curl -s http://localhost:<host port>/healthz` → `200`, and paste
the tunnel-hostname reachability note (or the `~/.cloudflared/config.yml` ingress
entry added).

**Gate**

All seven acceptance criteria hold objectively AND the backup/restore **drill was
actually run and reverted the mutation** AND the fresh `check-all.sh` is green
with coverage >90% on both packages. A snapshot that requires stopping the writer,
a drill that was described but not executed, a `/healthz` that leaks a secret or
appears in SSG output, a second writer topology, a new third-party dependency /
native binding, a runner-script edit without a justified new package, an escape
hatch (`as`/`any`/`ts-ignore`), or a throw where a `Result` belongs fails the
ticket.

## Considerations

- **Application-layer secret encryption is deferred, not forgotten.** The signing
  `private_jwk` is plaintext-in-DB; this ticket's boundary is filesystem custody +
  access-controlled off-host backups. Record a follow-up (envelope-encrypt the
  `private_jwk`, or move signing behind a KMS/key-file the DB never sees) with the
  revisit trigger: *the served instance holds a second class of high-value secret,
  or a compliance requirement lands.* Do not bolt on ad-hoc crypto here.
- **`VACUUM INTO` vs. the SQLite online-backup API.** `VACUUM INTO` is chosen for
  a live WAL DB because it is a single portable SQL statement through the existing
  `Db` seam — zero new surface. If `node:sqlite` later exposes a first-class
  backup handle and a large corpus makes `VACUUM INTO`'s full-copy cost hurt,
  revisit; until then the drill is the contract, not the mechanism.
- **Backups land on durable disk, never `/tmp`.** The rm→/tmp/.trash interceptor
  and the 16G tmpfs ENOSPC trap mean a `/tmp` snapshot frees nothing and can be
  trashed; the runbook pins a durable path and the drill verifies persistence.
- **No supervision framework is introduced.** Restart-on-crash is the compose
  restart policy; systemd/pm2/k8s are out of scope (zero new deps, and the guide
  precedent is compose-only). If the instance later needs richer supervision,
  that is its own operations ticket.
- **Rate-limiting and brute-force hardening** (ticket-19 fence) remain out of
  scope: this ticket operates the correct auth boundary, it does not add
  edge protection. The tunnel + the node adapter's DoS limits are the current
  posture; a WAF/rate-limit layer is a later operations item.
- **Reader/served split must stay clean.** The GitHub Pages reader and the tunnel
  hostname are separate origins; nothing in the served instance's config or
  `/healthz` may bleed into SSG output (ticket 14's byte-identity is the tripwire).
  Revisit trigger: when ticket 29 replaces qmu.co.jp on plggpress, re-examine
  whether the reader itself moves behind the served instance — at which point this
  topology's single-writer and backup posture must be re-scoped for higher traffic.
- **RTO/RPO are first drafts.** RPO = interval between `backup.sh` runs (document
  the chosen cadence), RTO = compose restart + restore time. Both are stated so a
  later scheduled-backup automation (a cron/loop) has a target; the cron itself is
  deferred — correctness does not depend on it.
