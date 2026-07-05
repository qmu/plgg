# Renderers & forms

How a scheduled `Scene` becomes pixels, and how forms
parse. Two renderers project the same mode-agnostic
[Scene](/packages/plggmatic/scheduler) into different
display shapes, and the form machinery parses drafts
through plgg [casters](/concepts/validation) so a form
never dispatches an invalid payload.

## Writing an app with it

Rendering is one function call on the scheduled scene
(`packages/plggmatic-example/src/app.ts`):

```typescript
import { schedule, multiColumn } from "plggmatic";

const scheduled = schedule(declaration);

const view = (model) =>
  multiColumn(scheduled.scene(model));
```

Or mode-switchable at runtime:

```typescript
import {
  renderMode,
  toggleMode,
  type Mode,
} from "plggmatic";

const view = (model) =>
  renderMode(model.mode)(
    scheduled.scene(model.scheduled),
  );
```

## The two renderers

- **`multiColumn`** — draws the level stack as panes
  expanding rightward: menu, list, child list, detail.
  Every landmark, close link, `aria-current`, and the
  confirm dialog come from the declaration alone; the
  app writes no ARIA by hand.
- **`singleColumn`** — one operation per screen: the
  same stack projected as a single `Screen`
  (`currentScreen`) with back behavior.
- **`renderMode(mode)(scene)`** dispatches between
  them; `toggleMode` flips. Because the vocabulary
  never names a display shape (decision D10), a flip
  mid-flow is loss-free: same flow position,
  selection, query, confirmation, and URL.

## Forms

Form state is data and validation is a caster. From
the forms showcase
(`packages/plggmatic-example/src/forms/formsDemo.ts`):
a caster-parsed create form where an invalid draft
shows a field error and dispatches **nothing**; a
valid draft disables the form, creates, and toasts
success; a destructive delete sits behind the confirm
dialog.

The machinery, all exported from `plggmatic`:

- **`parseForm`** — run a plgg caster over the draft
  payload; an `Err` becomes `FormErrors`.
- **`errorFor`** — project one field's error out of
  `FormErrors` for inline display.
- **`SubmissionState`** — `idleSubmission` /
  `pendingSubmission` / `isPending`; a pending form
  is disabled, preventing double submits.
- **Controls** — `textInput`, `textArea`,
  `selectInput`, `checkbox`; `formView` assembles
  labeled fields from `FieldSpec`s.
- **`confirmDialog`** — the modal a destructive
  [Action](/packages/plggmatic/scheduler)'s
  `confirm(message, true)` opens; cancel is a no-op.
- **`toast` / `toaster`** — semantic outcome
  messages (`tones`).

The controls are mode-agnostic components, so they
prove out in a plain plgg-view `sandbox` without the
scheduler — that is exactly what the forms showcase
does (see
[plggmatic-example](/packages/plggmatic-example)).

## Why renderers are data projections

A renderer consumes the `Scene` — levels, row links,
action buttons, query state, pending confirmation —
as **data**, not through callbacks. Interpreting data
with exhaustive [`match`](/concepts/match) means a new
`Level` variant is a compile error in every renderer,
and a new renderer (SSR included — plggpress's admin
UI renders the same declarations server-side) needs
no seam changes in the scheduler.
