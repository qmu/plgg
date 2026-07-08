---
type: Review
trip: plggmatic-extraction-cut
round: 1
reviewer: Planner
lens: business-outcome
status: draft
artifacts_reviewed:
  - models/model-v1.md
  - designs/design-v1.md
---

# Review v1

- **Reviewer:** Planner (business-outcome lens)
- **Round:** 1
- **Artifacts reviewed:** `models/model-v1.md` (Architect), `designs/design-v1.md` (Constructor)

## Content

I judge both artifacts against the durable-product outcome from Direction v1: the
engine is reusable *leverage* the whole family shares; Pragmatic's durable value is
the **AI-native design system** — vocabulary, the `--pm-*` design language, and the
emerging DSL — and the cut must (a) unblock plggpress, (b) keep the cross-repo
published seam narrow, and (c) send the extracted `../plggmatic` its *product
substance*, not a logo. Both artifacts converge strongly on the fundamentals; they
diverge on the two decisions the lead named, and my positions below are decided by
which option better protects that durable product value.

---

### Decision on Model v1 (Architect) — **Request revision**

The analysis is the strongest asset this trip has: the two-surface mapping, the
module-by-module engine-vs-identity table, the confirmed ~98%-engine finding, the
dependency-direction and roadmap (D1–D16) reconciliation, and — to the Architect's
credit — the honest naming of the empty-shell risk as *unresolved* (§5). I am
requesting revision of the two *recommendations*, not the analysis.

**Concern 1 (the load-bearing one) — the `--pm-*` recommendation gives away the
product's differentiator.** §3.2 recommends treating the `--pm` prefix + monochrome
default + storage key as **neutral plgg-scheme infrastructure / default theme**, with
the parameterize-the-prefix alternative flagged as "cleaner in principle" but
declined as too large. From the business lens this is the wrong trade: the `--pm-*`
design language *is* part of Pragmatic's durable identity (the concept names it
explicitly). Freezing it into the generic engine package hands Pragmatic's
differentiating design language to the commodity layer and — as the Architect
candidly concedes in §5 — leaves the extracted `../plggmatic` as the empty shell.
The extraction would then liberate a brand with no substance, which is exactly the
mirror risk Direction v1 warned against. "Cleaner in principle" here means "protects
the product's durable value," and that is worth the larger change.

**Concern 2 — two cross-repo published contracts where no consumer needs the split.**
`plgg-scheme` + `plgg-ui` doubles the published surface that crosses the repo
boundary and must be semver-maintained, yet the only current consumer (plggpress)
needs *both* surfaces, and no scheme-without-engine consumer exists. That is
versioning overhead spent on optionality nobody is buying — against the
independent-cadence outcome from Direction v1, which is best served by the *fewest*
stable cross-repo contracts.

**Constructive proposal (business-framed):** revise both recommendations toward the
outcome, not the mechanics. (1) Adopt the parameterized-`Theme` direction — the
Architect's own "stricter alternative" — so Pragmatic **owns** the `--pm-*` design
language and the plgg-family engine is brand-neutral; this is what gives the extracted
package real substance and makes the engine genuinely reusable by a non-Pragmatic
consumer. (2) Collapse to **one** plgg-family package with a `./style` subpath unless
a concrete scheme-only consumer can be named; a package is cheap to split *later* when
a real second consumer justifies it (sacrificial, documented), but a second cross-repo
contract is expensive to carry from day one. The excellent analysis survives intact;
only the two leanings change.

---

### Decision on Design v1 (Constructor) — **Approve with minor suggestions**

This is the concept-true cut and the more product-protective of the two on the
decisive question. One `plgg-ui` package with `.` + `./style` subpaths gives the
theme/engine separation-of-concern *without* a second published contract (resolving my
Concern 2 above). Declining the `plgg-view/style` base-token fold is a sound
vendor-neutrality call — it keeps the neutral render layer neutral. And **A3
(plggmatic owns the design language via a parameterized Theme) is the right answer to
the empty-shell risk**: it is precisely how the extracted package receives its durable
substance rather than a hollow re-export. The staging — minimal A1+A2 first for a fast
plggpress unblock, A3 before B spins the package out — is good business discipline:
fast value first, no empty-shell spin-out.

**Concern / trade-off the design under-scopes — where does plggpress get its theme
*after* A3?** A3 moves the `pm` prefix + monochrome values *out* to plggmatic, but
plggpress renders `--pm-*` and **must not depend on plggmatic**. As written, the
byte-stable `--pm-*`/`vp-appearance` contract (D16) is preserved only by A2's *default*
in plgg-ui; the moment A3 relocates ownership of `pm` to plggmatic, plggpress's theme
source is stranded unless it grows its own. If instead plgg-ui keeps `pm` as a
permanent shared default, plggpress stays implicitly wearing Pragmatic's design
language forever — which makes "plggpress stops depending on plggmatic" cosmetic rather
than real. This is the one coherence gap neither artifact closes, and it is the
linchpin of whether the whole outcome is genuine.

**Constructive proposal (business-framed):** make A3 **two-sided**. Parameterize
plgg-ui's `Theme` *and* give plggpress its **own** design-token set (its own
prefix/palette) so it stops wearing Pragmatic's `--pm-*` skin. The end state is then
the honest, concept-true one: a brand-neutral engine (`plgg-ui`) with *two* consumers
that each own their identity — plggpress with its tokens, plggmatic with the `--pm-*`
Pragmatic design language. That is what "plggpress stops depending on plggmatic"
*means* at the product level, and it turns the engine into real shared leverage.
Preserve the staging (byte-stable minimal cut first; A3 with plggpress's own tokens
before B), so the visual contract stays stable through the unblock and only the
*ownership* moves at A3.

---

### Cross-artifact coherence

**Strong shared base.** Both agree on everything that matters for de-risking the trip:
~98% engine → plgg-family; Pragmatic keeps identity + specs + DSL + showcase;
dependency direction strictly upward (plggpress/plggmatic → plgg-family, never
reverse); plggpress unblocked with its theme/Admin specs staying green; the concept's
"engine may belong to plgg-family, Pragmatic keeps the design system" governs. The
trip has a solid, low-contradiction foundation — the disagreement is narrow and
resolvable.

**The two divergences, resolved from business value:**

1. **One package vs. two** — I side with the Constructor's **one package + `./style`
   subpath**. It delivers the Architect's separation-of-concern without a second
   cross-repo published contract, which is what the narrow-seam / independent-cadence
   outcome asks for. Split into two only when a concrete scheme-only consumer appears.

2. **`--pm-*` ownership** — I side with the Constructor's **A3 (Pragmatic owns the
   design language)** over the Architect's neutral-default. Owning `--pm-*` is what
   makes the extracted package a product rather than a shell and what makes the engine
   genuinely brand-neutral and reusable. The Architect's own "cleaner in principle"
   note points the same way; the business case makes it "cleaner and necessary."

**The unresolved gap the next round must close** (bites A3 hardest, but is latent in
both): after `--pm-*` ownership leaves for plggmatic, **plggpress needs its own design
tokens**. Neither artifact scopes that. Until it is scoped, "plggpress stops depending
on plggmatic" is only cosmetically true. My recommendation — two-sided A3 with
plggpress owning its own tokens — is the convergence point that makes both artifacts'
intent real; I ask the Architect and Constructor to land there.

**Staging convergence (endorse).** Both support incremental delivery: unblock
plggpress fast with a byte-stable minimal cut, create the product substance (A3) before
spinning `../plggmatic` out, and never spin out an empty package. That protects fast
value and honors modular-monolith-first. Keep it.

## Review Notes

_(authors respond to reviewer feedback here)_
