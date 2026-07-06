# Forms & action components

plggmatic ships the form controls and action overlays the scheduler's
create/update/delete verbs are built from: controlled inputs, caster-parsed
forms, a modal confirm dialog, and toasts. Every control is a pure
`(props) => Html<Msg>` in the `button` idiom — controlled (value from props,
never internal state), labelled, and accessible — and they are **mode-agnostic**
(they import no layout, so both the multi-column and single-column renderers
compose them).

## Controlled controls

`textInput`, `textArea`, `selectInput`, and `checkbox` each take their value
from props and report changes as a `Msg`. Errors wire `aria-invalid` +
`aria-describedby` to the error text (in the `danger` role); a disabled control
wears the native attribute AND dims AND withholds hover feedback.

```ts
import { textInput, errorFor } from "plggmatic";
import { some } from "plgg";

const emailField = textInput({
  name: "email",
  label: "Email",
  value: model.emailDraft,
  placeholder: some("you@example.com"),
  error: errorFor(model.errors, "email"),
  disabled: model.submitting,
  onInput: (v) => ({ kind: "emailInput", value: v }),
});
```

## Parse, don't validate

There is no validate-then-convert step. Each field carries a **caster**
(`(value: unknown) => Result<A, InvalidError>` — the `asStr` shape), and
`parseForm` runs them all in one pass: the typed payload when every field
parses, or per-field errors when any fails.

```ts
import { parseForm } from "plggmatic";

// in update, on submit:
parseForm(
  [
    { name: "email", cast: asEmail },
    { name: "name", cast: asName },
  ],
  (field) => draftOf(field),
);
// Ok(payload) → pending state + the Action's Cmd
// Err(errors) → field errors, nothing dispatched
```

## Confirm dialog & toasts

`confirmDialog` renders ticket 09's pending-confirmation as a real modal
(`role="dialog"`, `aria-modal`, `aria-labelledby`, a backdrop that cancels on
click, a destructive confirm in the `danger` role). `toast`/`toaster` announce
feedback via `role="status"`/`aria-live` (`danger` escalates to `assertive`);
auto-dismiss is the consumer's `cmdEffect`, not a timer inside the component.

See the runnable demo in
[`packages/plggmatic-example/src/forms/`](../plggmatic-example/src/forms/) —
an invalid submit shows a field error and dispatches nothing, a valid submit
disables the form and toasts success, and a delete asks the dialog. The
numbered showcases live in the [demo catalog](/demo).
