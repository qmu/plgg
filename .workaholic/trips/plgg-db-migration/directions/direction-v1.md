# Direction v1

- **Author**: Planner
- **Status**: under-review
- **Reviewed-by**: (pending — Architect, Constructor)

---

## Content

### 1. Value Proposition

`plgg-db-migration` is a small, sovereign schema-migration tool for
applications built on the plgg stack. It gives a plgg developer the
single most familiar migration workflow in the industry — **one `.sql`
file per migration holding both an up and a down section, applied
incrementally, with applied state tracked in a `schema_migrations`
table** — without pulling a single new external dependency, native
binding, or vendor runtime into the project.

The one-sentence promise: **"Migrate any of your databases — including
a SQLite database you spin up per tenant, on first touch — with a tool
small enough to read in one sitting and owned entirely by you."**

Three things make this worth building rather than adopting an existing
tool:

1. **Familiar DX, zero foreign weight.** The dbmate / goose mental
   model (a directory of timestamped `.sql` files, `-- migrate:up` /
   `-- migrate:down` markers, a `schema_migrations` ledger) is already
   in the muscle memory of most backend developers. We deliver that
   exact experience as first-class plgg code, so adopting it costs a
   developer almost no new learning, while costing the *project* no new
   supply-chain surface. This is the same arc the team just completed by
   shedding vite/rolldown — capability kept, dependency removed.

2. **It closes a real gap in the plgg stack.** plgg already has, or is
   growing, the pieces to build a full server-side application from
   scratch — a router/HTTP layer, a SQL layer (`plgg-sql`), a view
   layer. Schema evolution is the missing operational primitive: today
   a plgg app has no sanctioned way to version and roll its database
   forward. Every serious application needs this on day one; right now
   each project would reinvent it. `plgg-db-migration` makes "evolve
   the schema" a stack capability instead of per-project glue.

3. **On-demand per-tenant SQLite migration is a genuine
   differentiator.** Mainstream migration tools assume a fixed set of
   long-lived databases known at deploy time. They do *not* gracefully
   answer "I have N thousand SQLite databases, one per tenant, created
   lazily, and each must be brought to the current schema version the
   first time it is opened." Treating per-tenant, lazily-provisioned
   SQLite migration as a primary use case — not an afterthought — lets
   plgg credibly support a cost-efficient, strongly-isolated
   multi-tenant architecture that the big frameworks make awkward.

### 2. User Personas

**Persona A — The plgg application developer (primary).**
Builds a conventional single-database (PostgreSQL or MySQL) application
on the plgg stack. Wants to add a column, create a table, or back out a
bad change with the same low-ceremony workflow they have used
elsewhere: write one `.sql` file, run an "up", run a "down" if it goes
wrong. They value being able to read and trust the whole tool. Success
for them: they never think about the migration tool — it behaves
exactly as dbmate-shaped intuition predicts, and they never had to vet
a new dependency tree to get it.

**Persona B — The multi-tenant SaaS builder (strategic).**
Building a product where each tenant gets an isolated SQLite database
(strong isolation, trivial per-tenant export/delete, cheap to
provision). New tenants appear at runtime, not deploy time. Their
sharp pain: "when tenant #4001 logs in for the first time tonight,
their fresh database must be created and brought to the current schema
version transparently, correctly, and exactly once even under
concurrent first-touch." This persona is why the on-demand path is a
headline feature rather than a nice-to-have, and is the persona most
underserved by existing tools.

**Persona C — The AI agent operator (emerging, planning-horizon).**
Increasingly the entity *running* the migration is an AI coding/ops
agent, not a human at a shell. It needs the tool's actions to be
observable, idempotent, dry-run-able, and to report state (which
migrations are pending/applied) in a machine-interpretable way, with a
clear point at which a human can observe and take over. Planning for
this persona now (per the A2A planning policy) costs little and keeps
the human-in-the-loop path aligned with the agent path on the same
commands.

**Persona D — The plgg maintainer (steward).**
Owns the package long-term. Wants it small, dependency-free, internally
consistent with plgg idioms (Option/Result, typed pipelines), and
testable to the project's >90% coverage bar. "Smaller better" is their
constraint as much as a user feature: every line is a line they must
maintain and every database dialect is a surface they must keep
correct.

### 3. System Positioning

`plgg-db-migration` sits at the **operational seam between the
application's source-controlled schema intent and the live database**.
It is downstream of `plgg-sql` (it issues SQL through, or alongside,
the stack's data-access layer) and upstream of every feature that
assumes a current schema. It is a *tool/library*, not a service: it
runs as part of deploy, of local development, and — for the per-tenant
case — inside the running application at tenant-provision time.

It positions plgg one decisive step closer to "you can build and
operate a real production application entirely on the plgg stack,
owning every layer." Migration is the operational rite of passage that
separates a toy stack from one a business can run on.

Boundaries (positioning by what it is *not*):
- It is **not** an ORM and not a query builder — it applies SQL the
  developer wrote; it does not generate schema from models.
- It is **not** a database driver — it depends on the stack's existing
  connection capability rather than bundling dialect drivers (a
  vendor-neutrality boundary; see Assumption 2).
- It is **not** a long-running service — no daemon, no control plane.

### 4. Business Rationale

**Why the dbmate-shaped DX is the right familiar model.**
Migration tooling is a domain where novelty is a *cost*, not a
feature. The single-file up/down-with-markers + `schema_migrations`
ledger pattern is the convergent design of dbmate, goose, and others
precisely because it minimizes the gap between a developer's intent and
the file they edit. Choosing the most familiar industry model maximizes
adoption and minimizes the support and documentation burden — the
business value is in *reducing* the surprise budget, leaving the team's
inventiveness for the parts that are genuinely novel (the per-tenant
path). Picking proven domain terminology up front is also the cheapest
way to seed the project's ubiquitous language.

**Why "smaller / sovereign" matters here specifically.**
This package was conceived right after the project deliberately removed
vite/rolldown to shed external weight, with a stated rule that removing
a dependency must not add new ones. Migration tooling is exactly where
sovereignty pays off: it touches production data, runs in deploy
pipelines, and runs *inside* the app for per-tenant provisioning — the
last place a project wants an opaque, native-binding-laden, externally
governed dependency. A migration tool small enough to read end-to-end
is one the team can fully trust with destructive operations. "Smaller
better" is therefore not minimalism for its own sake; it is a
trust-and-control requirement proportionate to what the tool is allowed
to do. (Vendor-neutrality and conservative dependence policy lens.)

**Why on-demand per-tenant SQLite migration is strategically
valuable.** Per-tenant database isolation is a design choice that is
"much cheaper to build in than to retrofit" (per-tenant-database
policy). A multi-tenant product that commits to shared-schema isolation
early, then discovers it needs hard per-tenant isolation for
compliance or trust reasons, faces a prohibitively expensive
migration. By making *automated, on-demand per-tenant provisioning and
migration* a first-class capability of the stack, `plgg-db-migration`
lets plgg products keep the strong-isolation option open from the first
tenant at near-zero marginal operational cost. SQLite-per-tenant also
directly serves data sovereignty: a single-tenant database is trivially
exportable and deletable in full, which makes the export/delete
obligations of the data-sovereignty policy almost free. This capability
is both a technical differentiator and a compliance-posture advantage —
a reason a SaaS builder would choose the plgg stack over a
heavier-framework default.

**Investment framing (ROI / phasing).**
The honest ROI read: the single-database dbmate-shaped core is
low-uncertainty, high-certainty value — every plgg app needs it, the
design space is well understood, and the return (a stack-level
operational primitive that stops being reinvented per project) is
clear. The per-tenant on-demand path is higher-uncertainty value: the
concurrency, "exactly-once first-touch," and lifecycle questions are
where the unknowns live. The investment should therefore be **phased**:
prove the familiar core first, then treat the per-tenant path as a
deliberately-scoped, verify-small increment rather than building it out
on unverified premises (proactive-PoC and IT-investment-evaluation
policy lens). Concretely, the core's value does not depend on the
per-tenant path succeeding, so the two can be sequenced and the
per-tenant path can be cut or reshaped after small verification without
sinking the core investment.

### 5. Business Risk Assessment

| Risk | Likelihood | Business impact | Mitigation direction |
| --- | --- | --- | --- |
| **Multi-dialect correctness** — "supports major databases" silently means PostgreSQL + MySQL + SQLite each having dialect quirks; a wrong assumption corrupts production schema. | High | Severe (data/trust) | Scope dialects explicitly and phase them; keep dialect-specific surface thin and behind a clear boundary; treat each dialect as a separately-verified increment. The Architect/Constructor decide the exact dialect mechanics — this direction only flags it as the dominant correctness risk. |
| **Destructive-operation trust** — down-migrations and per-tenant provisioning can drop/alter live data; an opaque tool here is a liability. | Medium | Severe | The "small enough to read" sovereignty constraint *is* the primary mitigation; reinforce with dry-run/observability so both humans and AI operators can see what will happen before it happens (A2A policy). |
| **Per-tenant first-touch concurrency** — two requests provision/migrate the same fresh tenant DB at once → corruption or partial schema. | Medium | High | Treat exactly-once-under-concurrency as an explicit requirement of the per-tenant feature, and verify it small before committing (PoC framing) rather than discovering it in production. |
| **Scope creep away from "smaller better"** — pressure to add ORM-like features, schema diffing, auto-generation erodes the core value. | Medium | Medium | Hold the positioning boundaries in §3 as explicit non-goals; "no new dependencies, no native bindings" is a hard line, not a preference (vendor-neutrality policy). |
| **Per-tenant path over-investment** — building the harder feature out before the core proves valuable. | Medium | Medium | Phase the investment (core first); gate the per-tenant build behind the core landing and a small verification. |
| **A2A/agent-operability deferred** — building only the human CLI path now, retrofitting machine-operability later at higher cost. | Medium | Low–Medium | Count the AI operator as a user from the start (Persona C); keep commands idempotent and state machine-readable. Do not over-commit to unsettled agent-protocol formats — leave margin (A2A policy). |

### 6. Assumptions Recorded (ambiguous instruction → reasonable interpretation)

The originating instruction is terse; per night/trip protocol I record
the interpretations this direction is built on, for the Architect and
Constructor to confirm or challenge:

- **A1 — "the one" the DX is modeled on = dbmate (with goose as
  secondary reference).** The phrase "same developer experience as the
  one that can apply incremental query having both up/down in a single
  sqlfile, and schema_migrations in a table" matches dbmate's design
  most precisely (single `.sql` file, `-- migrate:up` / `-- migrate:down`
  markers, `schema_migrations` table). I assume dbmate is the DX
  reference target.
- **A2 — "supports major database" = PostgreSQL, MySQL, SQLite at
  minimum**, with SQLite mandatory because the per-tenant feature
  depends on it. I assume the tool relies on the plgg stack's existing
  database-connection capability rather than bundling native drivers,
  to honor "no new dependencies / no native bindings." (Whether the
  current stack can already reach all three dialects is a structural
  question I leave to the Architect.)
- **A3 — "smaller better" = a hard zero-new-external-dependency,
  no-native-binding constraint**, not a soft preference, consistent
  with the just-completed vite-shedding arc and the vendor-neutrality
  policy.
- **A4 — "on-demand by-tenant-db migration to sqlite" = lazy,
  per-tenant, runtime provisioning + migration of an isolated SQLite
  database per tenant, brought to current schema version on first
  access, exactly once under concurrency.** I treat this as a
  first-class, but *phased and separately-verified*, capability.
- **A5 — Design-only trip.** Per the team lead, the trip stops after
  decomposition into tickets; no implementation this trip. This
  direction is written to inform model/design/decomposition, not to be
  built from directly.
- **A6 — Audience includes AI agents as operators** (Persona C), per
  the A2A planning policy, even though the instruction names only
  human-style DX.

### 7. Policy Lens Applied

This direction was shaped through the preloaded planning + design
policy lenses:

- **planning/market-research & terminology** — adopt the industry's
  convergent migration model and its proven vocabulary
  (`schema_migrations`, up/down) as the project's ubiquitous language.
- **planning/it-investment-evaluation & proactive-poc** — phase the
  investment (certain core first, uncertain per-tenant path verified
  small before build-out).
- **planning/ai-native-future (A2A)** — count AI agents as users;
  keep migration actions observable and interruptible.
- **design/vendor-neutrality** — "smaller better" as a hard
  no-new-dependency / no-native-binding boundary.
- **design/per-tenant-database** — per-tenant isolation is cheap to
  build in, expensive to retrofit; automate per-tenant provisioning.
- **design/data-sovereignty** — per-tenant SQLite makes full export
  and deletion of a tenant's data nearly free; a sovereignty advantage.

---

## Review Notes

(Reviewers append decisions and feedback here, or in
`reviews/round-1-architect.md` and `reviews/round-1-constructor.md`.)

- Open question for the **Architect**: does the current plgg stack
  already provide connection capability for all three target dialects,
  or does honoring A2/A3 constrain the supported dialect set? This is a
  structural/codebase question and is yours to resolve.
- Open question for the **Constructor**: is "exactly-once per-tenant
  first-touch migration under concurrency" achievable within the
  no-new-dependency constraint, or does it force a design trade-off
  worth surfacing early?
