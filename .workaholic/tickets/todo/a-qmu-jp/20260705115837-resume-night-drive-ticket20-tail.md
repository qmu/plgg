---
created_at: 2026-07-05T11:58:37+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 0.1h
commit_hash:
category:
depends_on: []
---

# RESUME night /drive — ticket 020 tail (settings + invite; core admin UI SERVED); 22 commits, 8 tickets + 20 core done, 11 remain

## What this ticket is

A **resumption checkpoint**. Not code work. First action: **archive/delete this
ticket, then run `/drive night`** — finish ticket 020's settings + invite, archive
it, then the queue. Tree **clean**, `check-all` green (exit 0) at HEAD = `0ebb0e0`.

## Position (2026-07-05 ~11:58 JST) — branch work-20260704-130317

**8 of 20 tickets COMPLETE + archived** (09-13, 16, 17, 19) + **ticket 020 CORE
SERVED** in 5 proven slices. 22 commits.

**Ticket 020 done**: pt.1 `b619078` content-browse; pt.2a `1b9b084`
listAccounts; pt.2b `a9e2458` members + grant/revoke role Actions; pt.4 `aa55d21`
D10 mode-parity proof; pt.5 `0ebb0e0` **MOUNT — deliverAdmin server-renders the
scheduled admin at the auth-guarded `/admin`** (SSR: schedule → init(url) → settle
async-source Cmds → renderToString(multiColumn)); one authDb backs the OP store +
account store + the admin's SAME account store (a UI role change = the guard's
role). `packages/plggpress/src/Admin/{adminDeclaration,deliverAdmin,adminRender.spec}.ts`.

## Ticket 020 — remaining TWO features (each needs a new mechanism), then archive.

- **pt.3 settings surface** — a settings FORM (ticket 12 caster-parsed forms, NOT
  a list Collection — settings is one form, so it uses the form-action machinery,
  not toRow). A runtime `settingsStore.ts` (in-memory, path-parameterised so
  ticket 28 wraps encryption). The operator LLM key is WRITE-ONLY: submit →
  validate via the **plgg-kit** seam (generateObject key resolution — confirm
  plgg-kit is a dep / available) → store (NOT SiteConfig, NOT the content index) →
  report only `configured|absent` masked. No secret in URL/log/response.
- **pt.2c createInvite Action** — BLOCKED on a surfacing mechanism: `createInvite(
  store, clock)(role, ttl)` (plgg-auth) returns `{token (PLAINTEXT, shown once),
  invite}`, but the scheduler `SchedulerMsg` union has NO toast/notify/flash Msg,
  so the shown-once link can't surface declaratively. TWO options: (A) add a
  transient-notice Msg to plggmatic's scheduler (Model carries an ephemeral
  notice cleared on next nav) + render it in both renderers; OR (B) surface it in
  the **SSR Action-POST layer** — deliverAdmin currently renders GET only; add a
  POST handler that runs the action's Cmd and, for createInvite, renders the
  plaintext link ONCE in the response page (never persisted/re-fetched). (B) fits
  the served model and also unlocks grant/revoke via POST. Recommend (B).
- deliverAdmin today is GET-render only; wiring Action POST (option B) is the
  natural next step and covers both invite + role mutations in the browser.
- Then specs green, fresh check-all, **archive 020** (frontmatter effort/category
  + Final Report of the 7 slices).

## Order after 020: 021 requests/comments (16,19) → 022 guest editing (17,20) → 023 media (16,22) → 024 RAG (16) → 025 voice (19,21,24) → 026 plgg-mcp stdio (16, NEW PKG) → 027 mcp HTTP+OAuth (19,26,21) → 030 plugin export (16,27) → 028 prod ops (19) → 029 rollout (16,28) → 185202 (LAST, ALONE).

## Loose ends (not blockers)
- Ticket 16's live `/api` mount can reuse `pressServeWebWithAuth`'s content index
  (already opened there) — mount `contentApi(contentDb)` at `/api`.
- plgg-auth `example.ts` RP-flow refactor onto beginLogin/completeLogin (demo).

## Key context (memory-backed)

Strict standard (no as/any/ts-ignore; Option/Result; exhaustive match;
printWidth 50; >90%/>91% four-metric coverage). Memory:
`reference_plggpress_serve_auth`, `reference_new_package_scaffold`,
`reference_coverage_proc_vs_iserr`, `reference_shell_interactive_aliases`.
Vocab: `declare({title,menu,collections:[collection<T>({id,title,toRow,source:
sync|async,child?,query?,actions:[action({id,label,verb,confirm:immediate()|
confirm(msg,destructive),run:(target)=>cmdEffect(()=>Promise<Msg>)})]})]})`;
`schedule(decl):Scheduled`={init(url)->[model,cmd],update,onUrlChange,toUrl,
historyMode,scene}. Renderers multiColumn/singleColumn/renderMode(mode) over a
scene → Html; serialize with `renderToString` (plgg-view). `Cmd` = CmdNone |
CmdBatch(Cmd[]) | CmdEffect(()=>Promise<Msg>); the SSR settle loop in
deliverAdmin.ts folds all three. Changing a shared interface needs a dist REBUILD
(`npm run build` in that pkg — symlinked) before consumers' tsc sees it + update
every stub. **`mkdir -p` scratchpad before check-all redirect** (else FALSE
exit-1). **plgg-test needs a DIRECTORY**. Per-ticket: tsc → `plgg-test <DIR>` →
coverage → rebuild dist if a barrel/interface changed → fresh detached check-all
(exit 0) → frontmatter → archive.sh. Decompose into per-slice green commits.

## Quality Gate

**Acceptance**: resuming session removes this ticket, finishes ticket 020
(settings + invite via the SSR action layer), archives it, then 021→…→185202.
**Verify**: `git log` shows this ticket gone + new `feat(...)` commits; check-all
green.
