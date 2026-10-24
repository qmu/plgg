import {
  Option,
  SoftStr,
  some,
  none,
  pipe,
  match,
  fromNullable,
  matchOption,
} from "plgg";
import {
  Html,
  text$,
  raw$,
  element$,
  lazy$,
} from "plgg-view/Html/model/Html";
import {
  Attribute,
  CssRule,
  attr$,
  handler$,
  anim$,
  css$,
  key$,
} from "plgg-view/Html/model/Attribute";
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
 * A {@link lazy$} node's collected rules, cached by its `arg` — a lazy
 * subtree's rules depend on nothing but what `arg` renders to, so an
 * unchanged `===` arg reuses the rules collected last time instead of
 * forcing the producer purely to recompute a stylesheet fragment that would
 * come out byte-identical. This is what keeps CSS collection from undoing
 * {@link lazy}'s "skip the rebuild" promise: without it, every `paint()`
 * would re-walk every lazy subtree for its `css()` atoms regardless of
 * whether the client renderer's own diff skipped it. Only an object `arg` is
 * a valid `WeakMap` key; a primitive `arg` just recomputes every time (rare —
 * `lazy` is meant for a model slice, typically an array or object).
 */
const lazyRuleCache = new WeakMap<
  object,
  ReadonlyArray<CssRule>
>();

/**
 * Collects one node's own {@link CssRule}s plus its children's, recursing
 * depth-first — the direct counterpart to {@link foldHtml}'s traversal,
 * written out here (rather than as a `foldHtml` algebra) specifically so a
 * {@link lazy$} node can be intercepted and memoized by `arg` at EVERY
 * nesting depth, not just the tree's root.
 */
const rulesOfNode = <Msg>(
  node: Html<Msg>,
): ReadonlyArray<CssRule> =>
  match(node)(
    [text$(), (): ReadonlyArray<CssRule> => []],
    // a raw passthrough carries no `css()` atoms
    [raw$(), (): ReadonlyArray<CssRule> => []],
    [
      element$(),
      ({ content }): ReadonlyArray<CssRule> => [
        ...rulesOf(content.attributes),
        ...content.children.flatMap(rulesOfNode),
      ],
    ],
    [
      lazy$(),
      ({ content }): ReadonlyArray<CssRule> => {
        const cacheKey: Option<object> =
          typeof content.arg === "object" &&
          content.arg !== null
            ? some(content.arg)
            : none();
        return matchOption(
          // non-cacheable (primitive) arg: no memoization seam, recompute.
          (): ReadonlyArray<CssRule> =>
            rulesOfNode(content.render()),
          (key: object): ReadonlyArray<CssRule> =>
            pipe(
              fromNullable(
                lazyRuleCache.get(key),
              ),
              matchOption(
                (): ReadonlyArray<CssRule> => {
                  const rules = rulesOfNode(
                    content.render(),
                  );
                  lazyRuleCache.set(key, rules);
                  return rules;
                },
                (
                  cached: ReadonlyArray<CssRule>,
                ): ReadonlyArray<CssRule> =>
                  cached,
              ),
            ),
        )(cacheKey);
      },
    ],
  );

/**
 * Collects the exact {@link CssRule}s an {@link Html} tree's `css()` atoms
 * need, deduped by content-hashed `className` (so an atom used N times yields
 * one rule). Pure; the data form lets the client sheet *accumulate* rules
 * across renders — an atom is immutable by construction (same class, same
 * declaration), so a union is always correct, and rules must outlive a tree
 * that drops them while an exiting node still wears their classes.
 */
export const collectCssRules = <Msg>(
  node: Html<Msg>,
): ReadonlyArray<CssRule> => {
  const unique = rulesOfNode(node).reduce(
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
