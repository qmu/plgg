---
created_at: 2026-06-10T12:29:27+09:00
author: a@qmu.jp
type: bugfix
layer: [UX]
effort:
commit_hash:
category:
depends_on:
---

# Escape CSS selector/prop/value to close `</style>` SSR XSS

## Overview

`renderCssRule` interpolates a rule's `selector`, `prop`, and `value` raw into
stylesheet text, and `htmlDocument` injects the joined result into a
`<style>…</style>` element **without escaping**. Declaration values flow from the
public `decl(prop, value)` / `style_()` API, which accepts arbitrary `SoftStr`.
An app that renders a user-controlled style value (e.g.
`decl("color", model.themeColor)`) lets an attacker break out of the `<style>`
element and inject a live `<script>` into the server-rendered document — stored
or reflected XSS.

This is the one output seam in the view layer that contradicts the otherwise-solid
escaping discipline: text nodes go through `escapeText`, attribute values through
`escapeAttr` (even the `attr("style", …)` escape hatch is escaped), but the
`style_`/`css()` → `<style>` path is not.

Severity: **HIGH**. SSR yields script execution; the client path (`sheet.ts`
writes via `textContent`) is limited to CSS injection, which is still abusable
(overlay/clickjacking, `background:url()` exfiltration), so both sides need the
fix.

## Key Files

- `packages/plgg-view/src/Html/usecase/collectCss.ts` (line 36-39) — `renderCssRule` builds `.${className}${selector}{${prop}:${value}}` with all three pieces raw.
- `packages/plgg-server/src/View/usecase/htmlDocument.ts` (lines 36-38) — injects `<style>${collectCss(opts.root)}</style>` unescaped.
- `packages/plgg-view/src/Style/usecase/style_.ts` (`ruleOf`, line 54-65) — where `decl` values become a `CssRule`; the natural place to validate/sanitize.
- `packages/plgg-view/src/Style/model/Style.ts` (`decl`, line 21) — public entry the value arrives through.
- `packages/plgg-view/src/Html/usecase/escape.ts` — home of `escapeText`/`escapeAttr`/`isSafeAttrName`; add a CSS sanitizer here alongside them.

## Implementation Steps

1. Add a CSS sanitizer in `escape.ts` (e.g. `escapeCssValue` / `isSafeCssValue`) that neutralizes the characters that let a value escape a declaration or the `<style>` element: at minimum `<`, `>`, `{`, `}`, `;`, and the `</style` sequence. Prefer a conservative allow-list / validation philosophy mirroring `isSafeAttrName` (reject-and-drop the rule) over best-effort character stripping, so the safe path is provable from the type/shape rather than from regex completeness.
2. Apply it to `selector`, `prop`, and `value` inside `renderCssRule` (or, better, at rule construction in `ruleOf` so both the SSR string fold and the client `sheet.ts` accumulation inherit the guarantee from one place). Decide deliberately where the boundary sits and document it.
3. Drop (do not silently mangle) any rule whose `selector`/`value` fails validation, consistent with how `isSafeAttrName` gates hostile attribute names; ensure the dropped-rule path is observable in tests.
4. Add unit tests: a `decl("color", "red}</style><script>alert(1)</script>")` must not produce `</style>` or `<script>` in `htmlDocument` output, and the equivalent client `sheet.ts` write must not inject extra rules.

## Patches

### `packages/plgg-view/src/Html/usecase/collectCss.ts`

> **Note**: Speculative — illustrates intent; final shape depends on where the sanitizer is placed (prefer `ruleOf`).

```diff
--- a/packages/plgg-view/src/Html/usecase/collectCss.ts
+++ b/packages/plgg-view/src/Html/usecase/collectCss.ts
@@ -35,5 +35,7 @@
 /** One {@link CssRule} as its stylesheet text. */
 export const renderCssRule = (
   rule: CssRule,
 ): SoftStr =>
-  `.${rule.className}${rule.selector}{${rule.prop}:${rule.value}}`;
+  `.${rule.className}${escapeCssSelector(rule.selector)}{${escapeCssProp(
+    rule.prop,
+  )}:${escapeCssValue(rule.value)}}`;
```

## Considerations

- Place the sanitizer once at the data boundary (`ruleOf`) so the SSR fold and the client sheet share one provably-safe path — aligns with **Preferring Rich Typing** (`standards:implementation`): narrow the CSS value's range to what is actually safe to emit rather than re-checking at each sink. (`packages/plgg-view/src/Style/usecase/style_.ts`)
- Keep the fix declarative and signature-evident per **Preferring Declarative Code** — a `CssRule` that exists should be safe to interpolate by construction. (`packages/plgg-view/src/Html/usecase/collectCss.ts`)
- Content-hashed `className` is already safe (djb2 → `c<base36>`); do not touch it. (`packages/plgg-view/src/Style/usecase/style_.ts` lines 41-52)
- Strict no-`as`/`any`/`ts-ignore` rule applies (CLAUDE.md). Coverage must stay above the project's >90% threshold; cover both the accepted and the dropped-rule branches.
