import { SoftStr, match } from "plgg";
import { Html } from "plgg-view/Html/model/Html";
import {
  Attribute,
  CssRule,
  attr$,
  handler$,
  anim$,
  css$,
  key$,
} from "plgg-view/Html/model/Attribute";
import { foldHtml } from "plgg-view/Html/usecase/foldHtml";
import { escapeCss } from "plgg-view/Html/usecase/escape";

/** The atomic {@link CssRule}s an attribute list contributes (only `Css` does). */
const rulesOf = <Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
): ReadonlyArray<CssRule> =>
  attributes.flatMap((attribute) =>
    match(attribute)(
      [attr$(), (): ReadonlyArray<CssRule> => []],
      [
        handler$(),
        (): ReadonlyArray<CssRule> => [],
      ],
      [anim$(), (): ReadonlyArray<CssRule> => []],
      [
        css$(),
        ({ content }): ReadonlyArray<CssRule> =>
          content.rules,
      ],
      [key$(), (): ReadonlyArray<CssRule> => []],
    ),
  );

/**
 * One {@link CssRule} as its stylesheet text. The content-hashed `className` is
 * safe by construction; `selector`/`prop`/`value` are {@link escapeCss}'d — the
 * single serialization chokepoint shared by the SSR fold ({@link collectCss})
 * and the client sheet, so neither can emit a `}`/`</style` breakout even when
 * an author feeds `decl()` untrusted data.
 */
export const renderCssRule = (
  rule: CssRule,
): SoftStr =>
  `.${rule.className}${escapeCss(
    rule.selector,
  )}{${escapeCss(rule.prop)}:${escapeCss(
    rule.value,
  )}}`;

/**
 * Folds an {@link Html} tree into the exact {@link CssRule}s its `css()` atoms
 * need — a `foldHtml` algebra gathers every node's rules, deduped by
 * content-hashed `className` (so an atom used N times yields one rule). Pure;
 * the data form lets the client sheet *accumulate* rules across renders — an
 * atom is immutable by construction (same class, same declaration), so a union
 * is always correct, and rules must outlive a tree that drops them while an
 * exiting node still wears their classes.
 */
export const collectCssRules = <Msg>(
  node: Html<Msg>,
): ReadonlyArray<CssRule> => {
  const rules = foldHtml<
    Msg,
    ReadonlyArray<CssRule>
  >({
    text: (): ReadonlyArray<CssRule> => [],
    // a raw passthrough carries no `css()` atoms
    raw: (): ReadonlyArray<CssRule> => [],
    element: (
      _tag,
      attributes,
      children,
    ): ReadonlyArray<CssRule> => [
      ...rulesOf(attributes),
      ...children.flat(),
    ],
  })(node);
  const unique = rules.reduce(
    (acc, rule) => acc.set(rule.className, rule),
    new Map<SoftStr, CssRule>(),
  );
  return Array.from(unique.values());
};

/**
 * {@link collectCssRules} rendered as one stylesheet string —
 * `.cls{prop:value}` / `.cls:hover{…}`. SSR-safe: this is what the server
 * injects into `<head>`.
 */
export const collectCss = <Msg>(
  node: Html<Msg>,
): SoftStr =>
  collectCssRules(node)
    .map(renderCssRule)
    .join("");
