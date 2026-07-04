# Theme toggle

`themeToggle` is the appearance switch — the component that exercises the [color scheme](/color-scheme)'s light/dark mechanism.

## Recorded rule

The framework ships the **view only**. The toggle renders the current scheme's icon (a sun in light, a crescent in dark — a shape cue, not a color one) and emits a `toggle` `Msg`; applying the `dark` class to `<html>` is the consuming app's update/effect seam, so the component stays pure. The `aria-label` names the destination scheme, and the control carries the shared focus ring.

## Usage

Pass the current `scheme` (the button shows where a click will take you) and the `Msg` a click produces:

```ts
import { themeToggle } from "plggmatic";
import { type Scheme } from "plggmatic/style";

type Msg = { readonly kind: "toggleScheme" };

const current: Scheme = "light";

const toggle = themeToggle<Msg>({
  scheme: current,
  toggle: { kind: "toggleScheme" },
});
```

Your `update` handles the `toggleScheme` `Msg` by flipping the scheme and toggling the `dark` class — the one side effect the framework leaves to the app.
