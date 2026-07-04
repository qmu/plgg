// Twin of the Button page's code fence. `onPress` is the
// typed `Msg` a click produces — the component is a pure
// view with no internal state.
import { button } from "plggmatic";
import { renderToString } from "plgg-view";

type Msg = { readonly kind: "save" };

export const saveButton = button<Msg>({
  label: "Save",
  onPress: { kind: "save" },
  disabled: false,
});

export const markup = renderToString(saveButton);
