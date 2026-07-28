import {
  type SoftStr,
  type Option,
  type Result,
  type InvalidError,
  some,
  none,
  ok,
  err,
  isOk,
  matchOption,
  fromNullable,
  invalidError,
} from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";
import {
  type ComponentSlot,
  componentSlots,
  slotSelector,
} from "plggmatic/Style/model/componentSlot";

/**
 * A CONSUMER'S RESTYLE of one framework component slot,
 * expressed as data instead of a hand-written `pm-*` rule.
 *
 * The framework owns the component selector (the `slot`,
 * resolved through {@link slotSelector}); the consumer
 * supplies only its OWN context and the declarations:
 *
 * - `scope`   — an optional leading selector the consumer
 *   owns (`.bo-results`), narrowing the override to a
 *   context; emitted as `<scope> <slotSelector>…`.
 * - `state`   — an optional pseudo/attribute suffix on the
 *   component (`:hover`, `[aria-current="page"]`).
 * - `within`  — an optional trailing consumer descendant
 *   (`.bo-result-meta`), emitted after the component.
 * - `declarations` — the CSS body (no braces).
 *
 * The consumer never writes a `pm-*` class string — that is
 * the by-name coupling this layer removes. {@link slotStyle}
 * builds one from trusted composition; {@link asSlotStyle}
 * validates untrusted (config-borne) input the same way
 * {@link asPalette} validates a palette.
 */
export type SlotStyle = Readonly<{
  slot: ComponentSlot;
  scope: Option<SoftStr>;
  state: Option<SoftStr>;
  within: Option<SoftStr>;
  declarations: SoftStr;
}>;

/**
 * Build a {@link SlotStyle} from trusted composition — the
 * constructor a consumer's own stylesheet uses. Optional
 * context fields are read at this builder boundary and
 * lifted into `Option` (the domain never carries
 * `undefined`).
 */
export const slotStyle = (
  spec: Readonly<{
    slot: ComponentSlot;
    declarations: SoftStr;
    scope?: SoftStr;
    state?: SoftStr;
    within?: SoftStr;
  }>,
): SlotStyle => ({
  slot: spec.slot,
  scope: fromNullable(spec.scope),
  state: fromNullable(spec.state),
  within: fromNullable(spec.within),
  declarations: spec.declarations,
});

// An SSR text escaper rewrites `< > &`, and a stray brace
// would break out of the emitted rule — so a consumer
// context/body carrying any of them is rejected, exactly
// the escape-safe invariant `chromeCss` holds by hand.
const escapeSafe = (s: SoftStr): boolean =>
  !/[<>&{}]/.test(s);

const at = (
  obj: unknown,
  key: string,
): unknown =>
  typeof obj === "object" &&
  obj !== null &&
  key in obj
    ? new Map(Object.entries(obj)).get(key)
    : undefined;

const isSlot = (
  v: unknown,
): v is ComponentSlot =>
  typeof v === "string" &&
  componentSlots.some((s) => s === v);

// Validate an optional context field: absent is fine
// (`None`), present must be an escape-safe string.
const optField = (
  value: unknown,
  label: SoftStr,
): Result<Option<SoftStr>, InvalidError> =>
  value === undefined
    ? ok(none())
    : typeof value === "string" &&
        escapeSafe(value)
      ? ok(some(value))
      : err(
          invalidError({
            message: `slot style ${label} is not an escape-safe string`,
          }),
        );

/**
 * Validate an unknown value (config-borne) as a
 * {@link SlotStyle}: the `slot` must be a declared
 * {@link ComponentSlot}, the `declarations` a non-empty
 * escape-safe string, and each optional context field
 * escape-safe when present. Validates SHAPE — a first
 * failing field wins and names itself, the {@link asPalette}
 * pattern.
 */
export const asSlotStyle = (
  value: unknown,
): Result<SlotStyle, InvalidError> => {
  const slot = at(value, "slot");
  if (!isSlot(slot)) {
    return err(
      invalidError({
        message: "slot style has no declared slot",
      }),
    );
  }
  const decls = at(value, "declarations");
  if (
    typeof decls !== "string" ||
    decls.length === 0 ||
    !escapeSafe(decls)
  ) {
    return err(
      invalidError({
        message:
          "slot style declarations are not a non-empty escape-safe string",
      }),
    );
  }
  const scope = optField(
    at(value, "scope"),
    "scope",
  );
  const state = optField(
    at(value, "state"),
    "state",
  );
  const within = optField(
    at(value, "within"),
    "within",
  );
  return isOk(scope) &&
    isOk(state) &&
    isOk(within)
    ? ok({
        slot,
        scope: scope.content,
        state: state.content,
        within: within.content,
        declarations: decls,
      })
    : err(
        invalidError({
          message:
            "slot style has a malformed context field",
        }),
      );
};

const prefixOf = (scope: Option<SoftStr>): SoftStr =>
  matchOption<SoftStr, SoftStr>(
    () => "",
    (s: SoftStr) => `${s} `,
  )(scope);

const suffixOf = (state: Option<SoftStr>): SoftStr =>
  matchOption<SoftStr, SoftStr>(
    () => "",
    (s: SoftStr) => s,
  )(state);

const descendantOf = (
  within: Option<SoftStr>,
): SoftStr =>
  matchOption<SoftStr, SoftStr>(
    () => "",
    (s: SoftStr) => ` ${s}`,
  )(within);

/**
 * Emit one {@link SlotStyle} as a CSS rule, resolving its
 * slot to the framework selector in the supplied theme's
 * namespace. Curried `slotStyleCss(theme)(style)`.
 */
export const slotStyleCss =
  (theme: Theme) =>
  (style: SlotStyle): SoftStr =>
    `${prefixOf(style.scope)}${slotSelector(theme)(style.slot)}${suffixOf(style.state)}${descendantOf(style.within)}{${style.declarations}}`;

/**
 * Emit a theme's per-component slot overrides as one CSS
 * block, in order. Injected AFTER {@link chromeCss} so the
 * consumer's declarations win the cascade over the
 * framework defaults at equal specificity. Empty (the
 * default theme carries no slots) emits nothing, so the
 * zero-config chrome is byte-unchanged.
 */
export const slotCss = (
  theme: Theme,
): SoftStr =>
  theme.slots
    .map(slotStyleCss(theme))
    .join("");
