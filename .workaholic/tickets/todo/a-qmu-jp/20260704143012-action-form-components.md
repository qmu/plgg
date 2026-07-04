---
created_at: 2026-07-04T14:30:12+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on: [20260704143006-plgg-view-cmd-sub-effects.md, 20260704143009-declarative-ui-vocabulary-and-scheduler-core.md, 20260704143003-plggmatic-token-matrix-monochrome-default.md, 20260704143005-plggmatic-non-color-design-tokens.md]
---

# plggmatic action & form components: controlled inputs, caster-parsed forms, `Cmd` submit pipeline, confirm dialog, semantic toasts

## Overview

Phase 4 (Scheduler), ticket **12** of the plggpress/plggmatic roadmap —
the form and action machinery of **D1**'s framework half ("declarative
definition of … actions (create/update/delete)" whose UI is scheduled),
rendering the confirmation-as-data and `Cmd`-mapped action verbs that
dependency ticket 09 puts in the scheduler, on the effects runtime
dependency ticket 06 lands per **D2**, colored by **D9**'s semantic
role×variant matrix. Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

Today plggmatic's Component barrel ships buttons, links, typography, nav
— and its own doc comment promises the rest: "form controls, tables, and
overlays arrive in later tickets, each with its own rule"
(`packages/plggmatic/src/Component/index.ts`). This is that ticket for
form controls and the two action overlays. Every pattern already exists
once, hand-written in `packages/example/src/app.ts` (the To-Do demo):
a controlled draft input inside a `form`/`onSubmit`, a checkbox driven
by `attr("checked","")` + `onChange`, a clear-completed confirmation
modal (backdrop + separately-positioned dialog so inside-clicks never
bubble to the backdrop's cancel), and a keyed toaster stack whose
`Toast` carries `tone: "success" | "info" | "danger"` — all styled with
app-local CSS strings and, in the modal's case, with **no**
`role="dialog"`/`aria-modal` semantics at all. This ticket lifts the
patterns into the design system as framework-owned, spec-asserted,
token-styled components, and adds what no oracle has yet: **form
assembly with caster-based validation** — house style, parse once with
`as*` casters (`Result<A, InvalidError>`), never validate-then-convert
twice — and a **submit pipeline as `Cmd`** with pending/disabled states.

What ships, concretely:

1. **Form control components** — `textInput`, `textArea`, `select`,
   `checkbox` — pure `(props) => Html<Msg>` in the `button` idiom, each
   controlled (`value_`/`checked` from props, never internal state),
   each with a real associated `<label>`, error-text association
   (`aria-invalid` + `aria-describedby`), the recorded disabled rule
   (native attribute + more-than-color, as `button` documents), the
   shared `focusRing`/`hoverDim` interaction set, and one recorded
   interaction rule per component (the barrel's promise).
2. **A small plgg-view gap fill**: `element.ts` has `form`, `label`,
   `input` but no `textarea`/`select`/`option` constructors — add them
   via the existing content-model factories (textarea text-only;
   select's children are options), plus attribute sugar the example
   spells raw today (`checked_`, `placeholder_`, `id_`, `for_`,
   `disabled_`). No runtime work: `payloadOf` already narrows
   input/textarea/select, `syncSetProperty` already drives controlled
   `value`/`checked`, and `<select>`'s recorded exclusion from
   `isValueControl` stands.
3. **Form assembly, caster-parsed**: a headless form model — field
   drafts as `SoftStr` in the consumer's Model, a caster per field
   (`(value: unknown) => Result<A, InvalidError>`, the `asStr` shape),
   parsed **once** at submit into the typed payload the Action verb's
   `Cmd` factory consumes; failures become per-field error data
   (`Option`, not null) that the controls render. No second validation
   layer anywhere.
4. **Submit pipeline as `Cmd`**: submission state as a closed union
   (idle / pending at minimum); pending disables every control and the
   submit button and withholds hover/press feedback; the action's
   completion `Msg` folds `Result` back into success/danger feedback.
   The pipeline speaks ticket 09's action lifecycle Msgs (requested /
   confirmed / cancelled / completed) — components render state, the
   scheduler owns it.
5. **Confirm dialog** for destructive actions: the framework rendering
   of ticket 09's pending-confirmation `Option` — backdrop-click and
   Cancel dispatch the cancel `Msg`, the destructive confirm button
   wears the `danger` role, and the a11y the oracle lacks arrives:
   `role="dialog"`, `aria-modal="true"`, `aria-labelledby` wired to the
   title. Z placement via ticket 05's backdrop `40`/overlay `50` bands.
6. **Toast/feedback surfaces** on the semantic roles: tone is D9's
   semantic role set (`success`/`danger`/`warning`/`info`), styled
   through the role×variant matrix (`surface`/`text`/`border` variants
   — ticket 03), announced via `role="status"`/`aria-live`, dismissible
   with an `aria-label`ed close; the keyed stack renders enter/exit
   motion under ticket 05's reduced-motion block. Auto-dismiss stays a
   consumer `cmdEffect` (ticket 06's toast demo is the precedent) — the
   component takes an `onDismiss` Msg, it does not own timers.

These are the building blocks ticket 20 (admin-ui-on-scheduler)
schedules; ticket 13's declarative example rewrite may also consume
them. No new package: plggmatic, plgg-view, and plggmatic-example are
already wired into `scripts/npm-install.sh`, `scripts/build.sh`, and
`scripts/check-all.sh`, so those scripts must **not** change, and zero
new dependencies enter any `package.json`.

## Policies

- `workaholic:implementation` / `policies/quality.md` — TypeScript
  strict mode is the sole static-analysis layer and
  `as`/`any`/`ts-ignore` are prohibited; the whole validation design
  rides it: casters return `Result<A, InvalidError>` so an unparsed
  draft can never reach an Action's typed payload without a compile
  error, control kinds and submission state are closed unions consumed
  with exhaustive `match`, and the plgg-view event surface stays
  `instanceof`-narrowed ("never cast", per `render.ts`). Prettier
  `printWidth: 50` governs every touched `.ts` file.
- `workaholic:implementation` / `policies/test.md` — coverage is gated
  per package: `packages/plggmatic/plgg-test.config.json` sets
  threshold 90 (excluding only `/index.ts`, `/styleEntry.ts`) and
  `packages/plgg-view/plgg-test.config.json` gates at its recorded 89;
  every new control, the form model, the dialog, and the toaster land
  fully spec'd (one colocated `.spec.ts` per module), with the parse
  pipeline and markup semantics asserted headlessly via
  `renderToString`.
- `workaholic:design` / `policies/accessibility.md` — the policy
  snapshot records accessibility as "not observed / not applicable (no
  UI components)"; that predates plggmatic. This ticket is where the
  highest-stakes semantics become framework-owned: label/control
  association, `aria-invalid` + `aria-describedby` error wiring,
  `role="dialog"`/`aria-modal` (missing from the oracle), `aria-live`
  feedback, native `disabled` (which also fixes tab order), and the
  more-than-color rules — disabled conveyed by cursor/opacity/withheld
  feedback, destructive intent by wording plus the `danger` role, focus
  by `focusRing`'s geometric outline.

## Key Files

- `packages/plggmatic/src/Component/index.ts` — the explicit barrel
  whose doc comment promises form controls and overlays "in later
  tickets, each with its own rule"; every new export goes through it
  (and `src/index.ts`), and the comment is updated to stop deferring.
- `packages/plggmatic/src/Component/usecase/button.ts` — the component
  idiom (props type + pure builder, one `style_` call, recorded rule)
  and the recorded disabled treatment the controls and the submit
  button reuse.
- `packages/plggmatic/src/Component/model/interaction.ts` — the closed
  `InteractionState` union and shared `focusRing`/`hoverDim`/`pressDim`
  set; a control inventing a new state must add it here, with a rule.
- `packages/plggmatic/src/Style/model/token.ts` — today's flat `Color`
  union and `colorVar`; ticket 03 rewrites it into the role×variant
  matrix the toast/dialog tones are spelled in. Import the landed
  shape.
- `packages/plggmatic/src/Meta/model/identity.ts` — `cssPrefix`; any
  class hook is derived from it, never hand-spelled.
- `packages/plggmatic/plgg-test.config.json` — threshold 90; unchanged,
  cited by the gate.
- `packages/plgg-view/src/Html/model/element.ts` — `form` (412),
  `label` (426), `input` (443) exist; `textarea`/`select`/`option` do
  not. The content-model factories (`flowEl`/`phrasingEl`/`voidEl`/
  `textEl`…) are the pattern for adding them.
- `packages/plgg-view/src/Html/model/Attribute.ts` — `onInput`/
  `onChange`/`onSubmit` (submit already calls `preventDefault`),
  `value_`, `name_`, `type_`; home of the new attribute sugar.
- `packages/plgg-view/src/Program/usecase/render.ts` — `payloadOf`
  (input/textarea/select narrowing), `isValueControl` + the recorded
  `<select>` exclusion, `syncSetProperty` for controlled
  `value`/`checked`: proof the runtime needs no diff.
- `packages/plgg-view/src/Program/model/Cmd.ts` — arrives with ticket
  06; the submit pipeline returns these as data, never executes them.
- `packages/plgg-view/plgg-test.config.json` — threshold 89; the new
  element/attribute modules are counted.
- `packages/plgg/src/Flowables/cast.ts`, `packages/plgg/src/Basics/Str.ts`
  — the caster vocabulary (`cast` pipelines; `asStr`'s
  `Result<Str, InvalidError>` shape) the field-parse seam is built on.
- `packages/example/src/app.ts` — the oracles: `Toast` (~line 67) and
  `pushToast` (~175), the confirm modal `viewModal` (~507, backdrop/
  dialog split, keyed fades, opacity-only dialog motion), the
  controlled checkbox row (~717), the draft input + `form`/`onSubmit`
  (~938). Source the behavior; do not clone the app-local CSS strings —
  restyle through tokens.
- `packages/plggmatic-example/` — the demo harness (ticket 09's
  scheduler demo entry lives here); this ticket's runnable proof
  extends it.
- `packages/site/site.config.ts`, `packages/site/examples/` — the docs
  surface for the new components' page + compiling example.

## Related History

- `20260704143006-plgg-view-cmd-sub-effects.md` (this todo queue,
  dependency) — supplies `Cmd` and migrates the To-Do example, adding
  toast auto-dismiss as its `cmdEffect` demo; its Considerations defer
  debounce/cancellation (relevant: no debounced validation here) and
  fence scheduler vocabulary out of plgg-view — the gap fill in step 2
  is element/attribute surface only, honoring that fence.
- `20260704143009-declarative-ui-vocabulary-and-scheduler-core.md`
  (this todo queue, dependency) — Action with confirmation-as-data,
  pending-confirmation as `Option`, the action lifecycle Msg set, and
  the typed renderer seam. Read what 09 **landed**, not its draft; its
  design spec is the contract these components render.
- Siblings: 10/11 (mode renderers — these components must work under
  both, so nothing here may assume a column or a screen), 13 (example
  rewrite; the phase-4 line-count gate lands there), 20
  (admin-ui-on-scheduler — the consumer this ticket exists for), 03
  (semantic role×variant matrix), 05 (z bands, reduced-motion block).
- `.workaholic/tickets/archive/work-20260531-003055/20260531064930-redesign-plgg-view-renderer-as-diff-patch.md`
  — where controlled `value`/`checked` property-sync and the
  `instanceof`-narrowed payload discipline were built; the recorded
  reasons `render.ts` needs no diff now.
- `.workaholic/tickets/archive/work-20260531-003055/20260604004534-plgg-view-transition-directive.md`
  and `20260609185443-plgg-view-keyed-reconcile-flip.md` — the To-Do
  example's toaster stack and confirm modal arrived as these tickets'
  motion demos; their keyed enter/exit and backdrop/dialog split are
  the behavioral oracle (story: `.workaholic/stories/work-20260623-214128.md`
  covers the later polish era).
- `.workaholic/tickets/archive/work-20260531-003055/20260613183139-research-ref-post-paint-hook.md`
  — the ref/post-paint research; full dialog focus-trap management
  waits on it (see Considerations).
- `.workaholic/tickets/archive/work-20260703-184443/20260704011005-vocabulary-articles-example-first.md`
  — the example-code-first docs convention the site page follows.

## Implementation Steps

1. **Pin the landed contracts.** Read what dependencies actually
   shipped: ticket 06's `Cmd` constructors, ticket 09's Action /
   confirmation / lifecycle-Msg shapes and renderer seam, ticket 03's
   semantic-role matrix type, ticket 05's z-band and reduced-motion
   exports. Where this ticket's prose and a landed shape disagree, the
   landed shape wins.
2. **plgg-view element/attribute gap fill**
   (`packages/plgg-view/src/Html/model/element.ts`, `Attribute.ts`):
   add `textarea`, `select`, `option` through the content-model factory
   discipline (typed children: select→option, textarea text-only —
   exact factory choice is drive's call inside `element.ts`'s existing
   system), and `checked_`, `placeholder_`, `id_`, `for_`, `disabled_`
   sugar over `attr`. Spec construction + `renderToString` output. No
   diff in `render.ts` (assert in review, not code).
3. **Field/form model** (proposed `packages/plggmatic/src/Form/model/`;
   design may amend the home): a `Field` as pure data — label, name,
   control kind (closed union: text/textarea/select/checkbox), draft,
   error as `Option<InvalidError>` — and a form-parse usecase: apply
   each field's caster to its draft, folding to
   `Result<Payload, per-field errors>` in one pass ("parse, don't
   validate": the ONLY validation is the cast that produces the typed
   payload). DOM-free, Node-importable.
4. **Control components**
   (`packages/plggmatic/src/Component/usecase/`): `textInput.ts`,
   `textArea.ts`, `selectInput.ts`, `checkbox.ts` — each pure, each in
   the `button` idiom, each recording its one interaction rule.
   Shared requirements: controlled value/checked; `<label>` associated
   via `for_`/`id_`; error rendering with `aria-invalid` +
   `aria-describedby` pointing at the error text (error ink in the
   `danger` text role); disabled = native attribute + `cursor` +
   opacity + withheld hover/press (button's recorded rule); `focusRing`
   on every focusable; token utilities only, class hooks via
   `cssPrefix`. Checkbox dispatches on `onChange` ignoring the payload
   (the oracle's pattern — payload is not checked-state).
5. **Form assembly + submit pipeline**: a `form` component wrapping
   plgg-view's `form`/`onSubmit` (preventDefault is already the
   runtime's contract) that renders fields + a submit `button`; a
   headless submit fold for consumers' `update`: parse per step 3 —
   `err` ⇒ new model with field errors, `cmdNone`; `ok` ⇒ submission
   state pending + the Action verb's `Cmd`; completion Msg folds the
   `Result` to success/danger feedback and returns to idle. Submission
   state is a closed union; pending propagates `disabled` to every
   control and the submit button. Components stay pure views — the
   scheduler (09) owns lifecycle state; this ticket must not fork a
   second action state machine (the fold speaks 09's Msgs).
6. **Confirm dialog** (`confirmDialog.ts`): props = title, body,
   confirm/cancel labels, `onConfirm`/`onCancel` Msgs; destructive
   confirm styled in the `danger` role. Structure per the oracle:
   backdrop and dialog as sibling keyed nodes (inside-clicks can't
   bubble into cancel), opacity-only dialog motion; add the missing
   semantics: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
   Z via ticket 05's backdrop/overlay bands; colors via `--pm-*` roles
   only. Renders ticket 09's pending-confirmation `Option` — `none` ⇒
   nothing.
7. **Toast + toaster** (`toast.ts`, keyed stack builder): tone = the
   semantic role set from ticket 03 (success/danger/warning/info),
   surface/text/border variants per tone; `role="status"` with
   `aria-live="polite"` (decide and record whether `danger` escalates
   to `assertive`); dismiss button with `aria-label`; keyed enter/exit
   fades covered by the reduced-motion block. No timers inside —
   `onDismiss` Msg only; auto-dismiss remains the consumer's
   `cmdEffect`.
8. **Barrels**: `Component/index.ts` (+ new `Form` index if the dir
   lands) and `src/index.ts`; rewrite the barrel's "arrive in later
   tickets" comment to reflect what remains (tables).
9. **Runnable demo** (proof-of-value): extend ticket 09's demo entry in
   `packages/plggmatic-example` — replace its deliberately crude action
   UI where forms are concerned: create a note through the caster-
   parsed form (submit an invalid draft first: field error appears,
   nothing dispatched), delete behind the confirm dialog (cancel is a
   no-op), success and danger toasts on completion. Real browser drive.
10. **Docs**: a components/forms page in `packages/site` with a
    compiling example under `examples/`, wired into `site.config.ts`
    — example-first per the vocabulary-articles convention.
11. **Specs, one per module**: `renderToString` assertions on every
    control's markup (label association, `aria-invalid`/
    `aria-describedby` exact, native `disabled`, controlled
    value/checked attributes), dialog semantics (`role`/`aria-modal`/
    `aria-labelledby`, danger confirm), toast tones × variants and live
    region; parse-fold specs (all-valid ⇒ typed payload + pending +
    `Cmd` as inert data; any-invalid ⇒ errors keyed to fields, no
    `Cmd`; completion folds both `Result` arms); plgg-view element/
    attribute specs. Returned `Cmd`s are asserted as data, never run.
12. **House rules end to end**: no `as`/`any`/`ts-ignore`; Option not
    null/undefined; exhaustive `match` over control kinds, tones, and
    submission state; data-last pipelines; Prettier `printWidth: 50`;
    zero new dependencies; no diffs under `scripts/`.

## Quality Gate

**Acceptance criteria**

1. plggmatic exports `textInput`, `textArea`, `selectInput`,
   `checkbox`, the form assembly, `confirmDialog`, and `toast`/toaster
   — all pure `(props) => Html<Msg>` (plus the headless form model/
   fold), styled only through token utilities and `--pm-*` roles, class
   hooks via `cssPrefix`, each with a recorded interaction rule.
2. Validation is caster-parsed exactly once: field casters return
   `Result<_, InvalidError>`, the form fold produces either the typed
   Action payload or per-field error data, and no separate
   validate-then-convert path exists anywhere in the diff.
3. The submit pipeline is effects-as-data: specs prove an invalid
   submit returns no `Cmd`, a valid submit returns the Action verb's
   `Cmd` as inert data plus a pending state that disables every control
   and the submit button, and completion folds both `Result` arms into
   feedback.
4. Accessibility is framework-owned and spec-asserted: label/control
   association, `aria-invalid` + `aria-describedby`, native `disabled`,
   `role="dialog"`/`aria-modal`/`aria-labelledby` on the dialog,
   `role="status"`/`aria-live` on toasts, `aria-label`ed dismiss/close,
   motion under the reduced-motion block.
5. plgg-view gains only element/attribute surface (`textarea`,
   `select`, `option`, attribute sugar): `render.ts` and the `Program`
   runtime have no diff; SSR renders every new element correctly.
6. Mode-agnostic: no new module imports `plggmatic/Layout` or assumes a
   column/pane/screen context — the components must be composable by
   both ticket 10's and ticket 11's renderers.
7. The demo drive passes end to end in a real browser: invalid submit
   shows a field error without dispatching; valid submit disables the
   form, completes, and toasts success; destructive delete asks
   confirmation (cancel no-op, confirm executes and toasts).
   `git diff --stat` shows no changes under `scripts/` and no new
   dependencies in any `package.json`.

**Verification method**

`scripts/tsc-plgg.sh` clean; `./scripts/test-plgg-view.sh`,
`./scripts/test-plggmatic.sh`, and `./scripts/test-plggmatic-example.sh`
green; then a **fresh** `scripts/check-all.sh` (clean rebuild — stale
dists must not mask drift in consumers of the new plgg-view surface)
green end to end, with plggmatic above its configured 90 and plgg-view
above its configured 89 across statements/branches/functions/lines
including all new modules. Manually drive the demo (criterion 7's
sequence) in a browser.

**Gate**

All seven acceptance criteria hold objectively AND the fresh
`check-all.sh` is green AND the browser demo drive passes. A single
escape hatch, a second validation layer beside the casters, a timer or
executed effect inside a component, a missing ARIA association from
criterion 4, a `Program`-runtime diff in plgg-view, a coverage dip, or
a `scripts/` diff fails the ticket.

## Considerations

- **Phase-1 assumption**: tones and z bands are spelled in ticket 03's
  matrix and ticket 05's tokens, which phase ordering lands long before
  phase 4. They are not `depends_on` entries (the direct contracts are
  06 and 09); if this ticket is somehow driven before them, stop and
  reorder rather than inventing interim color/z literals.
- **Ticket 09 contract risk**: the submit fold and confirm dialog
  render 09's landed action lifecycle. If 09's design step reshaped
  confirmation (e.g. scheduler-internal only), follow the landed shape
  and record the resolution — do not maintain a parallel state machine
  in the form layer.
- **Focus management is deliberately minimal**: the dialog ships
  correct semantics but no focus trap / focus return — that needs the
  ref/post-paint seam (research ticket `20260613183139`, unbuilt).
  Record the limitation in the dialog's doc comment; revisit trigger:
  ticket 20's admin UI, where keyboard-only operation gets tested for
  real.
- **Deferred controls**: radio groups (checkbox covers booleans until a
  consumer earns radios), multi-select/option groups, and file inputs
  (ticket 23 media-asset-management owns upload) — the control-kind
  union is closed, so each arrives as a compile-visible variant later.
- **Debounced/live validation is out**: ticket 06 deliberately shipped
  no cancellation; validation here is parse-at-submit (plus whatever a
  consumer wires per-field via `onInput` Msgs). Revisit with the
  admin-search debounce trigger recorded in 06.
- **The To-Do example is NOT migrated here**: it stays the raw
  plgg-view showcase; rewriting it on plggmatic components would blur
  ticket 13's line-count proof and the packages' layering story. Only
  plggmatic-example's demo entry consumes the new components now.
- **Error message copy** lives in `InvalidError` messages from casters;
  human-friendly per-field wording (and any future i18n — a recorded
  roadmap deferral) is the consumer's concern via its caster choice,
  not a translation layer in the components.
