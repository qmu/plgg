# Round 1 Review — Planner

- **Reviewer**: Planner
- **Artifacts reviewed**: `models/model-v1.md` (Architect), `designs/design-v1.md` (Constructor)
- **Lens**: business outcome / stakeholder value / planning + design policy

---

## Decisions at a glance

| Artifact | Decision |
| --- | --- |
| `model-v1` (Architect) | **Approve with observations** |
| `design-v1` (Constructor) | **Approve with minor suggestions** |

Both faithfully carry direction-v1 into structure and build. My
concerns are about *what we promise users* and *serving the AI-agent
operator persona*, not about the core shape, which I endorse.

---

## Ratifications requested by the lead

### R1 — Persistence-policy reconciliation (in-house build vs "adopt established frameworks"): **RATIFIED.**

The Architect's §3 resolution is correct and I ratify it as the
business stance: **we adopt dbmate's *convention* verbatim — single
`.sql` file with `-- migrate:up` / `-- migrate:down`, a
`schema_migrations` table, timestamp-ordinal versions, `up`/`down`/
`new`/`status` — and sovereign only the *implementation*.** This is the
exact precedent the team just lived through shedding vite/rolldown for
`plgg-bundle`: capability and convention kept, dependency removed.

Why "smaller/sovereign" is worth re-implementing rather than adopting
an existing JS migration library (the ROI argument the policy demands):

- **This tool runs destructive SQL in production and inside the running
  app** (per-tenant first-touch). A migration tool small enough to read
  end-to-end is a *trust* requirement proportionate to that blast
  radius — not minimalism for its own sake.
- **Zero-new-dep is a hard line here, not a preference** (direction A3).
  Every JS migration lib drags a dependency tree (and often native
  driver bindings) into the most safety-critical path in the stack.
  Adopting one would re-import precisely the liability the vite-shedding
  arc just removed.
- **The convention is stable and widely understood**, so re-implementing
  it costs the *user* almost no new learning — the surprise budget stays
  near zero, which is the whole point of choosing a familiar model.

The in-house build is therefore aligned with `it-investment-evaluation`
(the return — a sovereign, auditable, dependency-free operational
primitive every plgg app needs — justifies the build), not a
policy violation. **Ratified.**

### R2 — Scope deferrals to v1+: **RULED.**

From the `proactive-poc` / `it-investment-evaluation` phasing lens
(certain core first; defer the uncertain or boundary-violating):

- **(D) `schema.sql` dump — DEFER, out of v1.** Agreed with Architect
  Risk D / Constructor §5. It requires shelling to `pg_dump` /
  `mysqldump` / `sqlite3`, which directly breaks zero-deps /
  no-native-binding (A3). It is *not* load-bearing DX — the up/down +
  `schema_migrations` ledger is. Deferring it protects the core value
  prop. Defer with the door open: if demand appears, the honest path is
  a plgg-native dumper, not a shell-out — that is a future trip, not v1.
- **(C) Cross-process per-tenant coordination — DEFER full
  coordination, but KEEP best-effort idempotency (see coherence note
  C1).** Full distributed coordination (leader election / distributed
  lock across multiple Node instances) is out of v1 — correct. But the
  Constructor's §2.5 `BEGIN IMMEDIATE` + in-lock re-check + `version`-PK
  idempotency is cheap, prevents *corruption* (not just duplication),
  and must stay IN v1. The v1 promise: "safe (no corruption) under
  concurrency within and across processes; optimal (single migration
  run) coordination only within a process." Document that boundary
  plainly so an operator knows what is and isn't guaranteed.
- **(E) `down` semantics — RULE: last-applied-only is the v1 default
  (dbmate parity), with the optional `--to <version>` target the design
  already includes.** This matches the familiar model (R1) and is the
  safe default for a destructive operation. Irreversible migrations
  (`down: None`) failing loudly as a typed value is the correct, safe
  behavior — ratified.

### R3 — Does "supports major databases" hold, or need reframing? **HOLDS technically; the user-facing promise MUST be reframed.**

The grounding is confirmed and matches direction A2: plgg-sql ships **no
drivers**; the app supplies the `Db`; the tool emits only dialect-correct
*bookkeeping* deltas and runs the developer's per-dialect migration SQL.
This satisfies my value proposition *architecturally* and is in fact a
sovereignty **strength**. But "supports major databases" as a bare
marketing line risks an expensive user surprise — a reader could expect
*write-once-run-on-any-DB migrations*, which is false (and false in
dbmate too). Protecting the business outcome means closing that
expectation gap up front.

**Ratified reframing of the value-prop language** (for docs/README and
the decomposition to adopt; supersedes the looser phrasing in
direction-v1 §1):

> *"plgg-db-migration works with whatever database your plgg app already
> talks to — you supply the connection (the `Db`), the tool supplies the
> dialect-correct `schema_migrations` ledger and apply/rollback flow for
> PostgreSQL, MySQL, and SQLite. You write each migration in your target
> engine's SQL, exactly as you would with dbmate."*

This keeps the promise honest (no surprise budget), turns the
"app-supplies-the-driver" fact from a caveat into the sovereignty
selling point, and sets correct expectations for the per-dialect-SQL
reality (Architect Risk A). I can cut a **direction-v2** to make this
canonical if the lead wants it in the artifact of record; otherwise this
ratified language stands for the decomposition. Direction-v1 otherwise
**holds in full**.

---

## `model-v1` (Architect) — Approve with observations

**Strengths (business lens).** The coherence claim ("a migration is the
same kind of object as everything else in plgg-sql") is exactly the
"shared pipeline vocabulary" outcome I want — it means the tool feels
native, not bolted on, which lowers adoption cost. The §3
translation-fidelity table is the right instrument for keeping the
dbmate-DX promise honest feature-by-feature. The four boundaries (esp.
the tenant-resolution seam keeping the tool ignorant of tenant topology)
correctly honor `per-tenant-database`'s "automate provisioning
regardless of model."

**Concern P-M1 (Persona C / A2A absent) — with proposal.** My
direction names the **AI-agent operator** as a first-class persona
(A2A planning policy: count AI as a user; keep actions observable and
interruptible). The model is framed almost entirely around human dbmate
parity; there is no observability/preview surface called out.
*Proposal:* add a **dry-run / plan-preview** capability to the model as
a first-class concern — `status` already renders the `Plan`, so expose
"what would `up` apply, without applying" as a returned structured
value. This serves the agent operator *and* doubles as the
destructive-operation-trust mitigation I flagged in direction §5
(human-or-agent sees what will happen before it happens). Cheap to add
now, expensive to retrofit.

**Observation P-M2 (cross-process scope wording).** Model Risk C says
cross-process coordination is "out of v1 scope," while design §2.5
ships a cross-process safety mechanism. Not contradictory, but the
wording should be reconciled per R2/C1 so the scope boundary is stated
identically in both artifacts.

---

## `design-v1` (Constructor) — Approve with minor suggestions

**Strengths (business lens).** §1.2's explicit naming of "the gap"
(plgg-sql ships no drivers) is exactly the honest grounding R3 needed,
and the conservative reading ("we own the dialect deltas; the app owns
the connection") is the right ROI posture. The §4 delivery plan already
phases the build the way `it-investment-evaluation`/`proactive-poc`
want — pure core first (1–4), CLI (5), per-tenant (6) last. The §3
quality strategy (pure core exhaustively tested, DB usecases against
in-memory `node:sqlite`, >90% gate) directly satisfies the coverage
feedback policy.

**Concern P-D1 (per-tenant path needs an explicit PoC gate) — with
proposal.** Ticket 6 (per-tenant) is the genuinely novel,
high-uncertainty surface (model Risk C). Listed as just another ticket,
it risks being built out on unverified concurrency premises — the exact
state `proactive-poc` warns against. *Proposal:* make the **concurrent-
cold-start race test the explicit PoC checkpoint** for ticket 6 — i.e.
the design records that the per-tenant migrator's value is *verified
small* by that race test passing before the path is considered done, and
that the core (tickets 1–5) delivers standalone value even if the
per-tenant path is later reshaped. This is a documentation/sequencing
ask, not a redesign.

**Suggestion P-D2 (dry-run in the CLI/API).** Mirror P-M1: add a
`status`-backed **preview/dry-run** so both a human and an AI operator
can inspect the pending plan before `up`. The `Plan` value already
exists; surfacing it as a non-mutating command is small and high-value
for trust and A2A-readiness.

**Suggestion P-D3 (document the sovereignty wins, don't build them).**
Two positioning assets from direction-v1 are worth one README sentence
each (build nothing): (a) per-tenant SQLite makes full tenant
export/delete nearly free — a `data-sovereignty` advantage of choosing
this stack; (b) the "you supply the `Db`, we supply the ledger" framing
from R3. These cost a sentence and convert architecture facts into
adoption arguments.

---

## Cross-artifact coherence

Overall coherence is **high** — same taxonomy (`domain`/`usecase`/
`vendors`/`entrypoints`), same `Dialect`-as-declarative-value strategy,
same two-layer per-tenant concurrency story, same deferrals (D, dump).
Two items to reconcile before decomposition:

- **C1 (scope wording, per R2/P-M2).** Reconcile "cross-process out of
  scope" (model) with "best-effort cross-process idempotency in v1"
  (design). My ruling: best-effort idempotency (no corruption) is **in**;
  full distributed coordination is **deferred**. Both artifacts should
  state that single boundary identically.
- **C2 (multi-statement DDL execution — Architect/Constructor technical
  call, flagged not ruled).** Model Boundary 1 proposes extending the
  plgg-sql `Db` seam with an additive `exec(text)` for trusted
  multi-statement scripts; design §2.1 instead splits on `;` inside the
  tool (carrying design Risk 1, naive splitting). This is a
  structural/technical decision for the two of you to converge — **not
  mine to rule** — but it has a business dimension worth weighing:
  splitting-in-the-tool keeps the blast radius inside the new package
  (no plgg-sql change) but risks the naive-split correctness hazard;
  extending the seam is a (breaking-allowed) plgg-sql change but removes
  that hazard for everyone. Please converge on one before decomposition
  so the ticket boundary is clean; my only business ask is that whichever
  you pick, the migration-body execution path is *robust enough that a
  developer's normal multi-statement migration is not silently
  mis-split*.

---

## Summary

I endorse the model and the design. R1 (in-house build), R2
(deferrals: dump out, best-effort cross-process idempotency in,
last-applied-only down), and R3 ("supports major databases" reframed for
honesty) are ratified/ruled above. My two substantive business asks are
**(1) add a dry-run / plan-preview** to serve the AI-agent operator
persona and reinforce destructive-op trust (P-M1/P-D2), and **(2) make
the per-tenant race test the explicit PoC gate** for the high-uncertainty
ticket (P-D1). Both are additive and do not block consensus.
