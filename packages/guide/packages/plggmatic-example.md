# plggmatic-example

The [plggmatic](/packages/plggmatic/) workbench: the
reference app rewritten as a **declaration** — the
proof that the
[declarative scheduler](/packages/plggmatic/scheduler)
carries a real application. The hand-written program
(691 lines of `Model`, `Msg`, `update`, URL codec, and
column-stack view) became a **263-line declaration**;
the app author writes only the declaration, the
app-identity chrome, and a thin mount.

## Writing an app with it

The whole package is three authored pieces:

- **`src/declaration.ts`** — the program as data: a
  sections→notes drill-down, a filterable `tasks`
  collection, and create / delete-with-confirmation
  actions whose mutations live inside `cmdEffect`
  thunks (runtime-executed), never in `update`.
- **`src/app.ts`** — `schedule(declaration)`, the
  `multiColumn` view, and the stylesheet assembly
  from `plggmatic/style` tokens:

```typescript
export const scheduled = schedule(declaration);

export const app = {
  ...scheduled,
  view: (model) =>
    slot(
      [attr("class", "ex-root")],
      [
        span(
          [attr("class", "ex-brand")],
          [text("Field Notes")],
        ),
        multiColumn(scheduled.scene(model)),
      ],
    ),
};
```

- **`src/main.ts`** — the mount.

Every landmark, close link, `aria-current`, and the
confirm dialog come from the declaration alone.

## The forms showcase

A second entry (`src/forms/formsDemo.ts`, served as
`forms.html`) proves the
[form machinery](/packages/plggmatic/renderers-forms)
in isolation — no scheduler, a plain plgg-view
`sandbox`: a caster-parsed create form (an invalid
draft shows a field error and dispatches nothing), a
destructive delete behind the confirm dialog, and the
toaster.

## Why it exists

plgg follows _prove value with a runnable demo_: the
scheduler shipped in the same branch as this rewrite,
so the derivation was validated against a real app the
moment it existed — and the specs assert the derived
URL codec directly (`scheduled.toUrl`), pinning the
derivation's behavior, not an implementation detail.

The package is `private: true`; it is a workbench, not
a published library. The step-by-step **tutorial**
package is [example](/packages/example) — this page's
package is the _scheduler's_ reference app.
