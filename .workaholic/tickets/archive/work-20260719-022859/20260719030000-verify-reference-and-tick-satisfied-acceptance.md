---
created_at: 2026-07-19T03:00:00+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort: 1h
commit_hash:
category: Changed
depends_on:
mission: grow-plggmatic-as-the-reference-framework
---

# Verify the reference and tick the already-satisfied acceptance items

## Overview

The `grow-plggmatic-as-the-reference-framework` mission reads 1/4, but two more
acceptance items appear already satisfied in this worktree and only need
verification + the mission checkboxes ticked (with evidence) and committed. This
is the unattended-safe slice of the mission; the remaining two items are
human/infra-gated (npm publish needs 2FA; the live-host Access/302 behaviour is
tunnel/Cloudflare-Access config) and are out of scope here — mint a `deferred`
ticket for each if you want them tracked, but do not attempt them unattended.

## Key files

- `packages/guide/index.md` — the `## The plggmatic reference` section (already
  links the reference: what it is, the live URL, the local dev command, the
  mission).
- `packages/plggmatic/package.json` — `version` (0.2.1) and `repository`
  (`git+https://github.com/qmu/plgg.git`).
- `packages/plggmatic-example/` — `npm run dev` / `npm run build`.
- `.workaholic/missions/active/grow-plggmatic-as-the-reference-framework/mission.md`
  — the Acceptance list.

## Steps

1. Verify the reference builds: `cd packages/plggmatic-example && npm run build`
   emits the demo bundles under `dist/`. Do NOT start the long-lived `npm run
   dev` server from the drive (the monitor run boots the dev env separately);
   a build is sufficient evidence for the "builds ... with hot reload" clause.
2. Confirm `packages/guide/index.md` links the reference (what it is + live URL
   `https://plggmatic-reference.qmu.dev/demo1.html` + local dev command). It
   does today — this satisfies acceptance item 2.
3. Confirm `packages/plggmatic/package.json` has `version` ≥ 0.2.1 and
   `repository.url` pointing at `qmu/plgg`. It does today — this satisfies the
   non-publish half of acceptance item 4; the publish itself stays gated.
4. Tick the two satisfied acceptance items in `mission.md` (guide-links-reference
   and the repository/version metadata), each on the same line as its `- [ ]`
   marker, and append a dated Changelog line. Leave the npm-publish and
   live-host/Access items unticked.
5. Run the gate: `./scripts/check-all.sh` green.

## Policies

- **Implementation — information/function stays reachable through multiple paths.**
  The guide must lead a developer opening plgg to the reference (what it is, the
  live URL, the local dev command); this ticket verifies that reachability path.
- **Operation — releases are a gated step.** The npm publish is not performed on
  this branch; ticking the publish acceptance item or invoking a publish is out
  of scope and deferred to the developer's gated release flow.

## Quality Gate

- **Acceptance:** the reference builds (`npm run build` emits demo bundles); the
  guide's reference section links what-it-is + live URL + local dev command; the
  plggmatic `package.json` has `version` ≥ 0.2.1 and `repository.url` at
  `qmu/plgg`; the two satisfied mission acceptance items are ticked on their
  `- [ ]` line with a dated Changelog entry; the npm-publish and live-host/Access
  items remain unticked.
- **Verification method:** run the build and inspect the two files; re-read
  `mission.md` to confirm exactly the two intended checkboxes flipped.
- **Gate that must pass:** `./scripts/check-all.sh` green.

## Considerations

- Ticking the publish acceptance item is PROHIBITED here — the npm package is not
  published from this branch; that is a gated release step for the developer.
- If build/verify surfaces real drift (guide link stale, metadata wrong), fix it
  in this ticket; if it needs design decisions, mint a `deferred` ticket instead
  of guessing.
