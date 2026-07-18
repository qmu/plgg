---
created_at: 2026-07-19T05:00:01+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 0.5h
commit_hash:
category: Changed
depends_on:
mission: grow-plggmatic-as-the-reference-framework
---

# Verify the live host returns the exhibit (not a 302 to Access login)

## Overview

HUMAN/INFRA-GATED — do NOT drive unattended. This tracks the second open
mission acceptance clause: `https://plggmatic-reference.qmu.dev/demo1.html`
returns the built exhibit for a reader who has passed Cloudflare Access, not a
302 to an Access login. Confirming this requires the `qmu-dev` cloudflared
tunnel to be up with the reference dev server behind it and the Cloudflare
Access policy configured — tunnel/Access infrastructure the developer owns, not
a drive-branch action. The reference already builds from this repo (verified:
`cd packages/plggmatic-example && npm run build` emits the demo bundles); this
ticket is only the live-host/Access half.

## Key files

- `packages/plggmatic-example/bundle.config.ts` — the `dev` section (port 51820,
  allowed hosts `localhost` and `plggmatic-reference.qmu.dev`).
- `~/.cloudflared/config.yml` (developer host) — the `qmu-dev` tunnel mapping
  `plggmatic-reference.qmu.dev` → local :51820.

## Steps

1. Boot the reference dev server (`cd packages/plggmatic-example && npm run
   dev` → :51820) and bring up the `qmu-dev` tunnel (developer host).
2. As a reader who has passed Cloudflare Access, request
   `https://plggmatic-reference.qmu.dev/demo1.html` and confirm a `200` with the
   exhibit HTML, not a `302` to the Access login.
3. Tick the mission's "The reference (demo1) builds and serves ... and the live
   host returns the exhibit (not a 302 ...)" acceptance item (same line as its
   `- [ ]` marker) with the observed status code as evidence, and append a dated
   Changelog line.

## Policies

- **Operation — the running system keeps serving.** The live host reachability
  (tunnel up, Access policy correct, exhibit served) is an operational/infra
  guarantee verified against the running system, not something a drive branch
  can assert; this ticket records that verification for the developer.

## Quality Gate

- **Acceptance:** `https://plggmatic-reference.qmu.dev/demo1.html` returns 200
  with the exhibit for an Access-passed reader (no 302 to login); the mission's
  live-host acceptance item is ticked with the observed status as evidence.
- **Verification method:** an authenticated HTTP request to the live URL and a
  re-read of `mission.md`.
- **Gate that must pass:** `./scripts/check-all.sh` green (the reference build is
  part of the gate).
