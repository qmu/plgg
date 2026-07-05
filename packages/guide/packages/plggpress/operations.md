# Operations

How the **served** [plggpress](/packages/plggpress)
instance stays up, where its data lives, and how it is
backed up (decision D5, ticket 28). The **public reader
is untouched** — it keeps deploying to GitHub Pages as
an SSG/CDN site; everything here is about the _dynamic_
always-on instance that serves `/admin`, the delivery
API, RAG, the agent mint, `/mcp`, and the plugin
export. The full runbook is `packages/plggpress/OPERATIONS.md`.

## Topology (dual-mode)

```
                 ┌── GitHub Pages (CDN) ── public reader (SSG)
  git corpus ────┤
                 └── cloudflared tunnel ── served plggpress ── SQLite index (WAL)
```

- **Public reader** — the SSG build on GitHub Pages:
  stateless, cached, no secrets.
- **Served instance** — one always-on `plggpress serve`
  process behind a `cloudflared` tunnel, owning the
  mutable state (the SQLite index plus the auth /
  stakeholder / draft / asset stores).

## Process & health

- Run `plggpress serve` under a supervisor (systemd
  `Restart=always`); on crash it restarts and the DB
  survives on disk.
- **`GET /health`** runs a schema probe against the
  index: reachable → `200 {"status":"ok"}`, unreachable
  → `503 {"status":"unavailable"}`. A DB fault is a
  _degraded response_, never a crash, so the probe is a
  clean "restart me" signal without flapping.

## SQLite: WAL + single-writer

- Open the index in **WAL mode** so readers never block
  the writer.
- **Single-writer policy**: exactly one `serve` process
  writes the index (SQLite is not a multi-writer
  server); a periodic `PRAGMA wal_checkpoint(TRUNCATE)`
  bounds the `-wal` file. Horizontal scale of the
  dynamic tier is out of scope — the reader stays on
  the CDN.

## Backup & restore

- **Backup** — `backupDatabase(db)(destPath)` runs
  `VACUUM INTO`, a transactionally-consistent hot
  snapshot that does not stop the writer; schedule it
  off-volume and copy to durable object storage. A
  failed backup is a typed `Err` to alert on.
- **Restore** — stop `serve`, swap the index file for a
  snapshot, restart; a snapshot is a whole consistent
  DB, so restore is a file swap with no replay.
- **Drill** — seed a row → back up → open the snapshot
  → confirm the row is present; this is what the ops
  spec asserts, so run it once per release.

## Operator secrets

- **Secret**: the operator LLM key (RAG + realtime
  mint) and the OP token-signing key. Supplied by the
  environment (env vars or a `0600` mounted secret
  file), **never committed, never in the git corpus**.
- The settings store persists the LLM key only after it
  validates and exposes it as `llmKeyStatus`
  (`configured` | `absent`) — the raw key is never read
  back over the API/UI. With **no key**, RAG degrades
  to FTS5 and the
  [voice UI stays dark](/packages/plggpress/agent-surfaces).
- Backups contain the DB (session/RP secrets) — encrypt
  snapshot storage at rest.

## Why this posture

The served instance holds durable state, so it is
operated like a small stateful service, not a static
site: one writer, WAL for concurrency, hot snapshots
for backup, a health probe for supervision, and secrets
at rest outside the corpus. Absence of a key is
graceful, so the instance is safe to run before every
vendor is wired — the deploy-time program lights each
feature up by supplying its key.
