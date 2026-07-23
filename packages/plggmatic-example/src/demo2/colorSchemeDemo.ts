import { type SoftStr } from "plgg";
import {
  type Html,
  slot,
  h2,
  h3,
  p as para,
  span,
  div,
  text,
  attr,
} from "plgg-view";
import {
  type Sandbox,
  type Cmd,
  cmdNone,
  cmdEffect,
} from "plgg-view/client";
import { themeToggle } from "plggmatic";
import {
  type Color,
  type Scheme,
  type SemanticRole,
  bg,
  style_,
  neutrals,
  semanticRoles,
  variants,
  applyScheme,
} from "plggmatic/style";

/**
 * Demo 2 — a runnable proof of plggmatic's SECOND pillar,
 * the light/dark color scheme driven by design tokens. The
 * framework's own `themeToggle` component flips the single
 * `html.dark` class through the framework-owned appearance
 * contract (`applyScheme`), and a grid of swatches — one
 * per semantic/neutral token — reschemes with it, because
 * every swatch is painted from a `var(--pm-*)` token, not a
 * baked hex. Two rules made visible: ONE class reschemes
 * everything, and NOTHING renders state by color alone
 * (every swatch carries its token name).
 *
 * A plgg-view `sandbox`: the toggle `Msg` flips the model's
 * scheme (so the icon/label update) and the app's effect
 * seam applies the class — the component itself stays pure.
 */

export type Msg =
  | Readonly<{ kind: "toggle" }>
  | Readonly<{ kind: "applied" }>;

export type Model = Readonly<{
  scheme: Scheme;
}>;

const flip = (s: Scheme): Scheme =>
  s === "light" ? "dark" : "light";

/**
 * The effect seam: apply the scheme to `<html>` and persist
 * it, then acknowledge. `applyScheme` is the framework's
 * appearance contract; running it inside `cmdEffect` (never
 * in the pure `update` body) keeps the reducer testable.
 */
const applyEffect = (scheme: Scheme): Cmd<Msg> =>
  cmdEffect(() => {
    applyScheme(
      scheme,
      document.documentElement,
      window.localStorage,
    );
    return Promise.resolve<Msg>({
      kind: "applied",
    });
  });

export const update = (
  msg: Msg,
  model: Model,
): readonly [Model, Cmd<Msg>] => {
  switch (msg.kind) {
    case "toggle": {
      const scheme = flip(model.scheme);
      return [{ scheme }, applyEffect(scheme)];
    }
    case "applied":
      return [model, cmdNone()];
  }
};

// The chip carries the demo hook AND the themed background
// atom in ONE `style_` call — `style_` is the sole class
// authority, so two `class` attrs would clobber. The chip
// repaints from `--pm-<token>` when the scheme flips.
const swatch = (token: Color): Html<Msg> =>
  div(
    [attr("class", "cs-swatch")],
    [
      div([style_("cs-chip", bg(token))], []),
      span(
        [attr("class", "cs-name")],
        [text(token)],
      ),
    ],
  );

const swatchGroup = (
  label: SoftStr,
  tokens: ReadonlyArray<Color>,
): Html<Msg> =>
  slot(
    [attr("class", "cs-group")],
    [
      h3(
        [attr("class", "cs-group-h")],
        [text(label)],
      ),
      slot(
        [attr("class", "cs-grid")],
        tokens.map(swatch),
      ),
    ],
  );

const roleTokens = (
  role: SemanticRole,
): ReadonlyArray<Color> =>
  variants.map((v): Color => `${role}-${v}`);

export const view = (model: Model): Html<Msg> =>
  slot(
    [attr("class", "cs-root")],
    [
      slot(
        [attr("class", "cs-bar")],
        [
          h2([], [text("Color scheme")]),
          themeToggle<Msg>({
            scheme: model.scheme,
            toggle: { kind: "toggle" },
          }),
        ],
      ),
      para(
        [attr("class", "cs-lead")],
        [
          text(
            "Every chip is painted from a var(--pm-*) token. Toggle the scheme: the single html.dark class reschemes all of them at once, and each keeps its name so no state reads by color alone.",
          ),
        ],
      ),
      swatchGroup("Neutrals", neutrals),
      ...semanticRoles.map((role: SemanticRole) =>
        swatchGroup(role, roleTokens(role)),
      ),
    ],
  );

/**
 * The wired sandbox program, seeded with the scheme the
 * boot decided (stored choice else OS preference) so the
 * toggle's icon matches the class already on `<html>`.
 */
export const makeProgram = (
  initial: Scheme,
): Sandbox<Model, Msg> => ({
  init: [{ scheme: initial }, cmdNone()],
  update,
  view,
});

/** The default program (light) — the spec's entry point. */
export const program: Sandbox<Model, Msg> =
  makeProgram("light");
