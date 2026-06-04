import { SoftStr } from "plgg";
import {
  Attribute,
  attr,
} from "plgg-view/Html/model/Attribute";
import { Styles } from "plgg-view/Style/model/Style";

/**
 * Composes typed utilities into a single `style="…"` attribute:
 * `style_(p(3), flex, gap(2))` → `attr("style", "padding:0.75rem;display:flex;
 * gap:0.5rem")`. Declarations are deduped by property with **last-wins**, so a
 * conditional override composes predictably (`style_(p(2), p(4))` →
 * `padding:1rem`). Returns `Attribute<never>` — it carries no `Msg` and drops
 * into any attribute list, exactly like {@link class_}. Reuses the existing
 * `attr` channel (the `style` name passes the SSR safe-name filter), so it needs
 * nothing from the runtime.
 */
export const style_ = (
  ...parts: ReadonlyArray<Styles>
): Attribute<never> =>
  attr(
    "style",
    Array.from(
      parts
        .flat()
        .reduce(
          (acc, style) =>
            acc.set(style.prop, style.value),
          new Map<SoftStr, SoftStr>(),
        ),
    )
      .map(([prop, value]) => `${prop}:${value}`)
      .join(";"),
  );
