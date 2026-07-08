---
created_at: 2026-07-08T21:39:46+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash: d8106786
category: Added
depends_on:
mission: plggmatic-ai-native-ui-toward-a-dsl
---

# Specify Pragmatic's input-field model (AI-generatable + AI-operable)

## Overview

Derived from the Pragmatic concept (`.workaholic/specs/20260708-pragmatic-ai-native-ui-concept.md`), the input half of the near-term specification work. Write the **specification of Pragmatic's input-field model**: how an input field carries its **function** — which control expresses which data type, what validation/casting it enforces, what affordance it presents — so that (a) a generating AI can pick and assemble the *right* input for a given data structure ("AI knows the data structures and the procedures that update them" → it produces the fields those procedures need), and (b) an operating agent, including a browser-side WebMCP agent, can read the produced input and **fill and submit it** deterministically on the user's behalf.

This is a **specification (documentation) ticket**, not an implementation. It distills the model from the existing samples — plggmatic's `Form/` layer (`parseForm`, `errorFor`, `formView`, and the controls `textInput`/`textArea`/`selectInput`/`checkbox`, with caster-parsed submission) and the Demo 1 add-record forms (the `SectionField` descriptor that drives control kind, label, validation, and the field-input message) — into an explicit, machine-legible model that feeds the DSL and the pending `/trip` (`20260708195655`).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — the spec lands in `.workaholic/specs/`, consistent with the plggmatic design specs (applies to all doc/code work)
- `workaholic:implementation` / `policies/objective-documentation.md` — factual description of the current `Form/` model with file:line evidence; proposed/target properties marked as such
- `workaholic:implementation` / `policies/type-driven-design.md` — an input is a typed descriptor (data type → control → caster/validation → message); the model is the typed contract a generating AI reads and an operating agent drives — the caster (`asX(unknown) => Result<X, InvalidError>`) boundary is central
- `workaholic:design` / `policies/self-explanatory-ui.md` — an input's purpose and correct use must be apparent from the field itself (label, placeholder, options, error) — the same legibility a generating/operating AI relies on
- `workaholic:design` / `policies/interaction-design-standard.md` — the input's states (idle/pending/error/success) and validation feedback are part of its definition
- `workaholic:planning` / `policies/accessibility-first.md` — WCAG 2.2 AA floor AND openness to AI operators: an input must be reachable and operable by assistive tech and by an agent alike (the same structural affordances serve both)
- `workaholic:planning` / `policies/ai-native-future.md` — A2A: an agent filling/submitting an input stays observable and interruptible by the user

## Key Files

- `.workaholic/specs/20260708-pragmatic-ai-native-ui-concept.md` — the concept this ticket specifies one half of; read first
- `packages/plggmatic/src/Form/` — `parseForm`/`errorFor`/`formView`, `FieldSpec`/`Payload`/`ControlKind`/`SubmissionState`: today's input vocabulary and caster-parsed submission
- `packages/plggmatic/src/Component/` — the input controls (`textInput`/`textArea`/`selectInput`/`checkbox`) as pure `(props) => Html<Msg>`; the operable output surface
- `packages/plggmatic-example/src/demo1/fields.ts` — Demo 1's `SectionField` descriptor (name/label/kind/placeholder/options/required/input): a worked, data-driven input model where a descriptor generates the control, its validation, and its message
- `packages/plggmatic-example/src/demo1/logic.ts` — `parseSectionForm`/`commitRecord`: the descriptor → caster → record path (data structure ↔ input ↔ update procedure)
- `packages/plgg/src/**` — the `asX(unknown) => Result<X, InvalidError>` caster/brand vocabulary the inputs validate against (the type boundary an AI reasons about)

## Related History

Demo 1's refactor produced exactly the kind of data-driven input descriptor this spec generalizes.

- [20260708143613-demo1-generic-record-section.md](.workaholic/tickets/archive/work-20260706-120449/20260708143613-demo1-generic-record-section.md) - collapsed per-field forms into one `SectionField` descriptor that drives control/validation/message from data — a concrete instance of an AI-generatable input model
- [20260706183200-plggmatic-demo-2-color-scheme.md](.workaholic/tickets/archive/work-20260706-120449/20260706183200-plggmatic-demo-2-color-scheme.md) - a sample exercising controls/interaction worth citing for input states

## Implementation Steps

1. Read the concept doc (and the sibling transition spec if it has landed) and fix the vocabulary (Field, Control, Caster/Validation, Payload, Submission state).
2. **Characterize the current model (factual):** document plggmatic's `Form/` layer — `FieldSpec`/`ControlKind`, the controls, `parseForm` + casters, `errorFor`, submission states — and Demo 1's `SectionField` descriptor, with file:line evidence.
3. **Define the data→input mapping:** how a data structure/type determines the right control, its validation (caster), its affordance — i.e. the rule a generating AI applies to produce the fields a given update procedure requires.
4. **Define the AI-generatable properties:** what a generating AI needs (the data type/shape and the update procedure's expected payload) to assemble the correct input, and the constraints that keep a generated input well-formed and validating.
5. **Define the AI-operable properties:** what a produced input must expose — stable field identity, control type, allowed values/options, current value, validation/error state, submit affordance — so a WebMCP/MCP-Apps agent can fill and submit it deterministically, with the user able to observe/interrupt (A2A), meeting the WCAG 2.2 AA floor for humans by the same structure.
6. **Write the spec** to `.workaholic/specs/20260708-pragmatic-input-field-model.md`: current model (factual, cited) → data→input mapping → AI-generatable properties → AI-operable properties → open questions handed to the DSL. Reuse the shared "AI-generatable/operable" property set defined with the transition spec.

## Quality Gate

**Acceptance criteria** (documentation-only — no code gate):

- `.workaholic/specs/20260708-pragmatic-input-field-model.md` exists and resolves, for the input scope, the concept's open questions: (a) how a data structure/type maps to the right input + validation, (b) the concrete AI-generatable properties, (c) the concrete AI-operable (WebMCP/MCP-Apps) properties incl. human-observability/interruptibility and the WCAG 2.2 AA floor.
- Every factual claim about the current model cites the code (`packages/plggmatic/src/Form/**`, `Component/**`, or the Demo 1 `fields.ts`/`logic.ts` sample) by path; proposed/target properties are marked as such.
- The spec is grounded in ≥1 existing sample (the `Form/` layer and/or Demo 1's descriptor) with file references.
- The spec reuses (does not fork) the shared AI-generatable/operable property set from the transition spec.
- The developer reviews and accepts the spec.

**Verification method:**

- Developer reads the spec against the concept doc's open-questions list and confirms each input-scope item is answered with evidence.
- `grep` the spec for un-cited "should"/"will" claims about current behavior — none remain unqualified.

**Gate:**

- The spec answers the input-scope checklist with sample-grounded, cited evidence AND reuses the shared property set AND the developer accepts it.

## Considerations

- Sibling ticket `20260708213945-specify-pragmatic-screen-transition-model.md` specifies the transition half and defines the shared "AI-generatable / AI-operable" property set; align to it so the two specs compose into one model rather than diverging.
- The caster boundary (`asX(unknown) => Result<X, InvalidError>`) is the crux of AI-operability for inputs: it is where an agent-supplied value is validated into a domain type — the spec should treat casters as the input's contract, not an implementation detail (`packages/plgg`).
- Feeds the `/trip` on `20260708195655`; cross-reference, don't pre-decide the plggmatic package boundary.
- Stay descriptive of what the samples have proven; don't over-specify controls the samples haven't exercised (the model is still being discovered empirically).
