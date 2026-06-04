import { SoftStr, match } from "plgg";
import { Html } from "plgg-view/Html/model/Html";
import {
  Attribute,
  CssRule,
  attr$,
  handler$,
  anim$,
  css$,
} from "plgg-view/Html/model/Attribute";
import { foldHtml } from "plgg-view/Html/usecase/foldHtml";

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
    ),
  );

/**
 * Folds an {@link Html} tree into the exact stylesheet its `css()` atoms need —
 * a `foldHtml` algebra gathers every node's {@link CssRule}s, deduped by
 * content-hashed `className` (so an atom used N times emits one rule), rendered
 * as `.cls{prop:value}` / `.cls:hover{…}`. Pure and SSR-safe: this is what the
 * server injects into `<head>` and the client mirrors into a `<style>`.
 */
export const collectCss = <Msg>(
  node: Html<Msg>,
): SoftStr => {
  const rules = foldHtml<
    Msg,
    ReadonlyArray<CssRule>
  >({
    text: (): ReadonlyArray<CssRule> => [],
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
  return Array.from(unique.values())
    .map(
      (rule) =>
        `.${rule.className}${rule.selector}{${rule.prop}:${rule.value}}`,
    )
    .join("");
};
