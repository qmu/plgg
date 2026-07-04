// Twin of the Theme toggle page's code fence. The
// component ships the view only: it renders the CURRENT
// scheme's icon and emits a `toggle` Msg — applying the
// `dark` class to <html> is the app's update/effect seam.
import { themeToggle } from "plggmatic";
import { type Scheme } from "plggmatic/style";

type Msg = { readonly kind: "toggleScheme" };

const current: Scheme = "light";

export const toggle = themeToggle<Msg>({
  scheme: current,
  toggle: { kind: "toggleScheme" },
});
