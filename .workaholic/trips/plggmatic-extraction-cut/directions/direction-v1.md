---
type: Direction
trip: plggmatic-extraction-cut
version: 1
author: Planner
status: draft
reviewed-by:
subject: >-
  Where to draw the boundary between the reusable plgg-family engine (stays in
  the monorepo, consumed by both plggpress and plggmatic) and the
  plggmatic-branded "Pragmatic" identity (ships to ../plggmatic).
---

# Direction v1

- **Author:** Planner
- **Status:** draft
- **Reviewed-by:**

## Content

### 1. The business question, stated plainly

This is not a packaging chore. The decision in front of us is: **what is the durable
product we are choosing to grow, and what is scaffolding we happen to have built
while discovering it?** The extraction ticket found that ~98% of the current
`plggmatic` code is generic engine. The naive reading of that number is "there is
almost nothing to extract, so barely move anything." The correct business reading is
the opposite: **the engine is not the product.** Pragmatic's durable value is the
**AI-native design system and the DSL it is becoming** — the vocabulary and the
guarantees that make a UI both AI-generatable and AI-operable — not the layout/render/
scheduler/form machinery that currently carries it. The cut must be drawn so that the
thing we ship to `../plggmatic` is the *identity and the design-system contract*, and
the thing that stays is the *rebuildable engine* that any consumer — plggpress today,
other consumers tomorrow — can stand on.

The north-star (the Pragmatic concept record) is explicit that this is a business/
product judgement, not a mechanical one: "Pragmatic's durable value is the AI-native
design system and its DSL, not the generic engine, which may well belong to the plgg
family." Direction v1 adopts that as its thesis and argues the cut from it.

### 2. Value proposition — two products, not one

Keeping everything fused as "plggmatic, a column-oriented UI framework" undersells both
halves. Splitting recognizes that we are actually building two things with different
lifecycles, different audiences, and different rates of change:

- **The plgg-family engine (stays).** Declare → schedule → render, the form/parse layer,
  the layout/component primitives, the scheme/appearance/theme-toggle mechanics. This is
  **infrastructure**: valuable precisely because it is generic, boring, stable, and
  reusable. Its business value is *leverage* — every consumer that stands on it inherits
  the totality, the closed-union safety, the URL-as-address discipline for free. It earns
  its keep by being depended upon, not by being branded.

- **Pragmatic / plggmatic (ships to `../plggmatic`).** The AI-native design system: the
  `--pm-*` design language, the design-token *values*, the identity, the showcase, and —
  as the terminal form — the **DSL** in which an AI writes a system and gets a working,
  operable UI. This is the **product with a story**: "a design system built for AI, where
  the UI is AI-generatable and the generated UI is itself AI-operable." Its business value
  is *differentiation* — it is the thing that is worth naming, versioning, and eventually
  putting in front of a market, because nothing else on the shelf makes both halves of
  that promise true at once.

Fusing them means the differentiated product can never be reasoned about, priced, or
released on its own terms, and the reusable engine can never be adopted by a consumer
who does not want the Pragmatic identity. Splitting lets each half be exactly what it is.

### 3. Where Pragmatic sits — system positioning

The stack the concept describes, framed as a value ladder:

- **plgg** — the pure functional foundation (Option/Result, casters, exhaustive match).
  The *trust substrate*: it is what makes regenerated code safe to trust.
- **plgg-view and the plgg-family engine** — the rendering layer and the generic
  declare/schedule/render/form machinery. The *leverage layer*: reusable mechanism.
- **Pragmatic / plggmatic** — the AI-native design system that sits **above** the engine.
  The *product layer*: the vocabulary, the design language, the guarantees (G1–G3
  generatable, O1–O5 operable), and the DSL those guarantees compose into.
- **Consumers** — plggpress's admin, the demo apps, and future consumers. The *proof
  layer*: living evidence that the vocabulary assembles real interfaces.

The cut we are settling is the line **between the leverage layer and the product layer.**
Draw it too high and plggpress is forced to keep swallowing the Pragmatic brand to get a
list view; draw it too low and the extracted Pragmatic is an empty shell with a logo,
carrying none of the mechanism it needs to demonstrate its own promise. The business test
for the line: *everything a non-Pragmatic consumer would want on its own* belongs to the
engine; *everything that only makes sense as "the AI-native design system"* belongs to
Pragmatic.

### 4. User personas

The cut serves four distinct constituencies, and their needs pull the line in consistent
directions:

- **plggpress-as-consumer (today, must not break).** Wants a stable, reusable admin
  UI runtime and theme mechanics without importing a sibling product's identity. Pulls the
  engine + scheme/appearance/toggle mechanics *down* into the plgg family so plggpress can
  depend on vocabulary, not on a brand. This persona is the acceptance test: plggpress must
  stop depending on plggmatic and stay green.

- **Future Pragmatic/plggmatic consumers (tomorrow, the market).** Want the *design system*
  — the `--pm-*` language, the identity, and ultimately the DSL — as a coherent product they
  can adopt for its AI-native promise. Pull the design-token values, identity, and showcase
  *up* into `../plggmatic`, and want that product to be releasable and versioned on its own
  cadence.

- **AI agents that generate the UI (the generatable half).** Want a closed, typed,
  machine-legible vocabulary to emit against — the proto-DSL. They care that the *design-system
  contract* (the schema an agent generates against) lives with Pragmatic, while the mechanism
  that executes it lives in the reliable engine. The cut must keep the generatable contract and
  the identity together, because the contract *is* the product.

- **AI agents that operate the UI (the operable half, incl. browser-side WebMCP/A2A).** Want
  the emitted interface to carry stable identity, enumerated affordances, legible state, and
  human-observability. This persona is why the engine's guarantees (URL-as-address, closed
  unions, controlled inputs) are load-bearing infrastructure that must stay reusable and rock-
  solid — and why the WebMCP surface, still an open question, must have a clear owning side of
  the cut so it is nobody's orphan.

### 5. Business risk assessment

The split is the right product decision, but it is **not free**, and honesty about the cost
is part of the direction:

- **The published-contract cost (the biggest risk).** Today the whole monorepo enjoys a
  standing freedom: "breaking changes OK — plgg is its own only consumer." That freedom
  **ends at the repo boundary.** The moment the plgg-family engine is consumed by an
  extracted `../plggmatic` living in a sibling repo, the engine's public surface becomes a
  *published contract* across a boundary we can no longer refactor in one atomic commit. Every
  symbol the extracted Pragmatic imports from the plgg family is now a promise. **This argues
  for cutting the engine's exported surface deliberately narrow and stable** — expose the
  vocabulary the product genuinely needs, and nothing incidental — so the cross-repo contract
  is small enough to keep honest. The wider the seam, the more expensive every future engine
  change becomes.

- **The "empty shell" risk (the mirror risk).** If the cut sends *too much* down into the
  engine, the extracted Pragmatic is a brand with no mechanism — it cannot demonstrate its own
  AI-native promise, and the extraction produces a product that is all identity and no
  substance. The engine finding (~98% generic) makes this a live danger. The direction's answer:
  the durable Pragmatic product is the *design-system contract + identity + DSL*, which is
  legitimately small in code but large in value; a small extracted package is acceptable **if
  it is the right small package** — the vocabulary and design language, not a hollow re-export.

- **The versioning/cadence benefit (the upside that pays for the cost).** Against those costs
  sits a real gain: once split, Pragmatic can be **versioned and released on its own cadence**,
  independent of the engine's churn. The design system can iterate toward the DSL, cut its own
  releases, and eventually reach a market without dragging the whole monorepo's release train —
  and the engine can stabilize as infrastructure. Independent lifecycles are exactly what you
  want for "stable infrastructure + fast-moving differentiated product." The published-contract
  discipline is the price of that independence, and it is worth paying.

- **Sacrificial-architecture alignment.** The concept frames the app as disposable and the
  data/domain/contract as durable. The cut should follow the same grain: draw the engine
  boundary along a **rebuildable unit** with a recorded rebuild rationale, so that if the engine
  is later regenerated or replaced, the Pragmatic product's contract is unaffected. The line that
  best survives future rebuilds is the line we want.

### 6. Business rationale — durable core vs. rebuildable identity

Reframing the ticket's own vocabulary through the product lens:

- **Durable core = the reusable engine + the plgg trust substrate.** Not because it is
  glamorous, but because *many things will depend on it* and its guarantees (totality, closed
  unions, addressability) are what make AI-regenerated UI trustworthy. It stays in the monorepo,
  keeps its refactor freedom internally, and exposes a deliberately narrow published surface.

- **Durable *product* = the Pragmatic design-system contract + the DSL.** The vocabulary an AI
  generates against and an AI operates through. This is the thing worth naming and eventually
  selling. It ships to `../plggmatic` and is what the whole extraction exists to liberate.

- **Rebuildable identity = the `--pm-*` design-token *values*, showcase, and branded skin.**
  These are the most disposable layer — a design language can be re-skinned without touching the
  contract or the engine. They travel with Pragmatic because they are *its* identity, but they
  are the part we should expect to iterate and regenerate most freely.

The one-sentence direction: **cut so that the plgg family keeps the boring, reusable, guarantee-
bearing engine as narrow-surfaced infrastructure, and `../plggmatic` receives the AI-native
design-system contract, its `--pm-*` identity, and the DSL it is becoming — because the engine is
leverage the whole family shares, and Pragmatic is the differentiated product worth releasing on
its own terms.**

## Review Notes

_(reviewers add notes here)_
