# plggpress — production operations runbook

Ticket 28 (Phase 11, D5). How the **served** plggpress instance stays up, where
its data lives, how it is backed up, and how its secrets are held. The **public
reader is untouched** — it keeps deploying to GitHub Pages as an SSG/CDN site
(D5's "public reader stays SSG/CDN"). Everything below is about the *dynamic*
always-on instance that serves `/admin`, the delivery API, RAG, the agent mint,
`/mcp`, and the plugin export.

## Topology (D5 — dual-mode)

```
                 ┌────────────────────── GitHub Pages (CDN) ── public reader (SSG)
  git corpus ────┤
                 └── cloudflared tunnel ── always-on served plggpress ── SQLite index (WAL)
```

- **Public reader**: the SSG build published to GitHub Pages. Stateless, cached,
  no secrets. Deploy = the existing `build`/publish flow.
- **Served instance**: one always-on `plggpress serve` process behind a
  `cloudflared` tunnel (see `reference_cloudflared_tunnel`: `*.qmu.dev` → a local
  port). It owns the mutable state (the SQLite index + the auth/stakeholder/draft/
  asset stores).

## Process supervision

- Run `plggpress serve` under a supervisor (systemd unit or equivalent) with
  `Restart=always`. On crash it is restarted; the DB survives (it is on disk, not
  in the process).
- **Liveness/readiness**: the supervisor and the cloudflared front probe
  **`GET /health`** (`src/ops/healthWeb.ts`). It runs a schema probe against the
  index: reachable → `200 {"status":"ok"}`; unreachable → `503
  {"status":"unavailable"}`. A DB fault is a *degraded response*, never a crash, so
  the probe is a clean signal for "restart me" without the process flapping.

## SQLite: WAL + single-writer

- Open the served index in **WAL mode** (`PRAGMA journal_mode=WAL`) at the vendor
  seam so readers never block the writer and vice versa.
- **Single-writer policy**: exactly ONE `serve` process writes the index. Do NOT
  run a second writer against the same file (SQLite is not a multi-writer server).
  Horizontal scale of the *dynamic* tier is out of scope (D5 keeps the reader on
  the CDN); if ever needed it is the D-revisit trigger, not this ticket.
- Keep the WAL checkpointed (SQLite auto-checkpoints; a periodic `PRAGMA
  wal_checkpoint(TRUNCATE)` in a maintenance window bounds the `-wal` file).

## Backup & restore (proven by a drill)

- **Backup**: `backupDatabase(db)(destPath)` (`src/ops/backupDatabase.ts`) runs
  `VACUUM INTO` — a transactionally-consistent hot snapshot that does NOT stop the
  writer. Schedule it (e.g. hourly) to a path off the instance's volume; copy the
  snapshot to durable object storage. A failed backup is a typed `Err` to alert on.
- **Restore**: stop the `serve` process, replace the index file with a snapshot,
  restart. Because a snapshot is a whole consistent DB, restore is a file swap — no
  replay.
- **Drill** (run this to prove the runbook): seed a row → `backupDatabase` to a
  temp file → open the snapshot → confirm the row is present. This is exactly what
  `src/ops/ops.spec.ts` asserts, so the mechanism is regression-tested; run the same
  steps against the real instance once per release.

## Operator secrets at rest

- **What is secret**: the operator LLM API key (RAG embeddings + the realtime mint,
  tickets 24/25), and the OP token-signing key (ticket 19). The RP/session secrets
  live only in the DB.
- **Posture**: secrets are supplied by the environment (env vars / a mounted secret
  file with `0600` perms owned by the service user), NEVER committed and NEVER in
  the git corpus. The settings store persists the LLM key only AFTER it validates
  and exposes it only as `llmKeyStatus` (`configured|absent`) — the raw key is never
  read back over the API/UI. With NO key configured, RAG degrades to FTS5 and the
  voice agent UI stays dark (the graceful-degradation gate).
- Backups contain the DB (session/RP secrets) — treat snapshot storage as secret
  and encrypt at rest.

## Checklist per release

1. `GET /health` returns 200 on the live instance.
2. Run the backup drill against the live DB; confirm the snapshot restores.
3. Confirm the supervisor `Restart=always` and the cloudflared route are up.
4. Confirm no secret leaked into the corpus or logs (`stderr` only for logs).
