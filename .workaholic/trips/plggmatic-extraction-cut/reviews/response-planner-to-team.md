---
type: Review
trip: plggmatic-extraction-cut
round: 1
reviewer: Planner
lens: business-outcome
kind: response-to-feedback
status: draft
verdict: accept
---

# Review v1 — Response to converged resolution

- **Reviewer:** Planner (business-outcome lens)
- **Verdict:** **ACCEPT** — the converged resolution meets my product bar; the one residual is a documented future refinement, not a blocker.

## Content

### The resolution satisfies the two-sided requirement

My linchpin concern was: after `--pm` ownership leaves for plggmatic, *where does
plggpress get its theme without depending on plggmatic?* The converged resolution
answers it cleanly, and the answer is the two-sided outcome I asked for:

- **plggpress owns its theme choice.** It imports `defaultTheme` from `plgg-ui` and
  **passes it explicitly at its composition root**. The theme is now a *decision
  plggpress makes*, not a skin it inherits — and it flows from the brand-neutral
  engine, never from plggmatic. This is precisely "plggpress owns its own identity."
- **plggmatic owns the design-system product.** The `Theme` contract + the `--pm-*`
  brand + the DSL are plggmatic's. The `--pm-*` design language is no longer frozen
  into the commodity engine; it is the extracted package's durable substance. This is
  precisely "plggmatic owns the design-system product."
- **The engine is genuinely brand-neutral.** A parameterized typed `Theme` with a
  neutral `defaultTheme` means `plgg-ui` is reusable by *any* consumer, each supplying
  its own theme — real shared leverage, not plggpress-shaped-and-branded.

That is the whole product outcome from Direction v1, achieved. One package with a
`plgg-ui/style` subpath (my one-package position) and Pragmatic owning `--pm-*` (my A3
position) — both live divergences resolved on the side that protects durable product
value.

### On "distinct non-monochrome token set NOW" — NOT required; future refinement

I do **not** require plggpress to ship a visually distinct palette now. What is
load-bearing for the product outcome is the **ownership seam** — that plggpress
*supplies* its theme explicitly at the composition root rather than inheriting it —
not the *values* it happens to supply. The moment the theme is passed in explicitly,
plggpress's independence from plggmatic is real, regardless of whether its tokens
match or differ from the Pragmatic default. Structural independence is what "stops
depending on plggmatic" means; visual differentiation is a downstream identity choice.

Two reasons this is the right call, not a compromise:

1. **Byte-identical-now is a feature, not a shortcut.** `defaultTheme` = today's
   monochrome keeps plggpress's live guide byte-stable and preserves the
   `vp-appearance` contract (D16) — the visual-regression gate stays green through the
   cut. Forcing a distinct palette now would break that stability for no product gain
   at this stage and widen scope.
2. **The seam, not the swatch, is the durable win.** Once plggpress passes its theme
   explicitly, giving it a distinct palette later is a values-only edit at its
   composition root with zero structural change. The expensive, load-bearing part
   (parameterization + explicit ownership) is done now; the cheap, cosmetic part
   (choosing different numbers) can happen whenever plggpress wants its own visual
   identity.

**Recommended residual (documented future item, not a blocker):** record a note that
plggpress *may* adopt a distinct token set at its composition root when it wants a
visual identity separate from Pragmatic's monochrome default — a values-only follow-up
enabled by this cut, owned by plggpress, requiring no engine or plggmatic change.

### Extract-now is acceptable

I also accept **extract-now**: because the resolution parameterizes the `Theme` and
gives plggmatic the contract + brand + DSL, the cluster leaves carrying real mass and
substance, not a promise — so the empty-shell risk that would have argued for waiting
is closed. No escalation needed.

## Review Notes

_(none — accepted)_
