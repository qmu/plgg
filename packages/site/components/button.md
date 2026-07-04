# Button

`button` is the action component: a pure function returning a real `<button type="button">`. It is never a `div` with a click handler.

## Recorded rule

An action is a real `<button>`, and `disabled` is conveyed by **more than color** — the native `disabled` attribute (which also drops it from the tab order), a `cursor:not-allowed`, and reduced opacity, with the hover and press feedback withheld. Enabled buttons carry the shared focus ring (a 2px outline offset from the control — a geometric, not color-only, focus cue).

## Usage

`onPress` is the typed `Msg` a click produces; the component holds no state.

```ts
import { button } from "plggmatic";
import { renderToString } from "plgg-view";

type Msg = { readonly kind: "save" };

const saveButton = button<Msg>({
  label: "Save",
  onPress: { kind: "save" },
  disabled: false,
});

const markup = renderToString(saveButton);
```

Pass `disabled: true` to render the native disabled state; the click no longer produces a `Msg`.
