import { SoftStr, box } from "plgg";
import {
  Attribute,
  CssRule,
} from "plgg-view/Html/model/Attribute";
import {
  Style,
  Styles,
} from "plgg-view/Style/model/Style";

/**
 * A variant-wrapped group of {@link Styles} — the same declarations applied
 * under a pseudo-class selector (`:hover`/`:focus`/`:active`). The thing inline
 * `style_` cannot express; `css()` turns it into a real atomic rule.
 */
export type Variant = Readonly<{
  selector: SoftStr;
  styles: Styles;
}>;

const variant =
  (selector: SoftStr) =>
  (...parts: ReadonlyArray<Styles>): Variant => ({
    selector,
    styles: parts.flat(),
  });

/** Apply styles on `:hover`. */
export const hover = variant(":hover");
/** Apply styles on `:focus`. */
export const focus = variant(":focus");
/** Apply styles on `:active`. */
export const active = variant(":active");

/**
 * A pure, deterministic class name for one atomic rule (djb2 over the rule's
 * identity → `c<base36>`). Content-addressed, so the same atom hashes to the
 * same class on server and client — no SSR/CSR mismatch, and identical atoms
 * dedupe in {@link collectCss}. (No `Math.random`/`Date`: banned here, and they
 * would break that agreement.)
 */
export const hashClass = (
  key: SoftStr,
): SoftStr =>
  "c" +
  Array.from(key)
    .reduce(
      (h, ch) =>
        ((h * 33) ^ ch.charCodeAt(0)) >>> 0,
      5381,
    )
    .toString(36);

const ruleOf = (
  selector: SoftStr,
  style: Style,
): CssRule => ({
  className: hashClass(
    `${selector}|${style.prop}:${style.value}`,
  ),
  selector,
  prop: style.prop,
  value: style.value,
});

const isStyles = (
  part: SoftStr | Styles | Variant,
): part is Styles => Array.isArray(part);

const compilePart = (
  part: SoftStr | Styles | Variant,
): Readonly<{
  classNames: ReadonlyArray<SoftStr>;
  rules: ReadonlyArray<CssRule>;
}> => {
  if (typeof part === "string") {
    return { classNames: [part], rules: [] };
  }
  const selector = isStyles(part)
    ? ""
    : part.selector;
  const styles = isStyles(part)
    ? part
    : part.styles;
  const rules = styles.map((style) =>
    ruleOf(selector, style),
  );
  return {
    classNames: rules.map((r) => r.className),
    rules,
  };
};

/**
 * The styling primitive — the one way to style an element. Each part is a
 * literal class hook (`string`), a group of {@link Styles} (atoms at the base
 * selector), or a {@link Variant} (atoms under `:hover`/`:focus`/`:active`).
 * Every declaration becomes one content-hashed atomic class; the element's
 * `class` is the joined set and the rules are carried for `collectCss` to emit
 * into a `<style>`. It is the sole authority for the element's `class` (pass
 * hooks as string parts rather than combining with `class_`). For a genuinely
 * dynamic inline value (e.g. `width:${pct}%` changing every frame, which would
 * mint a new class per value) reach for `attr("style", …)` directly — the
 * documented escape hatch. The runtime `Box` tag behind this is `"Css"`.
 */
export const style_ = (
  ...parts: ReadonlyArray<
    SoftStr | Styles | Variant
  >
): Attribute<never> => {
  const compiled = parts.map(compilePart);
  return box("Css")({
    classes: compiled
      .flatMap((c) => c.classNames)
      .join(" "),
    rules: compiled.flatMap((c) => c.rules),
  });
};
