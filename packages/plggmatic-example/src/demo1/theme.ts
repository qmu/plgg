import {
  type Theme,
  type SlotStyle,
  type RunwayOptions,
  slotStyle,
  pragmaticTheme,
} from "plggmatic/style";

/**
 * Demo 1's runway parameters: the column gap and the
 * last-column width fallback used until `advanceColumns`
 * measures the real one. The unbounded-depth runway
 * BEHAVIOUR (scroll-at-every-width + trailing spacer +
 * seek-head scroll) is the framework's; these are the
 * reference's parameters over it.
 */
export const demo1Runway: RunwayOptions = {
  gap: "1.5rem",
  lastFallback: "220px",
};

/**
 * Demo 1's restyle of the framework chrome, expressed as
 * declared per-component THEMING SLOTS instead of by-name
 * `pm-*` class overrides.
 *
 * Every rule that used to hand-write a framework class
 * string in `demo1/styles.ts` now names a
 * {@link ComponentSlot} and supplies only the demo's own
 * context (`scope`/`state`/`within`) and declarations; the
 * framework owns the `pm-*` selectors and emits these
 * through {@link slotCss}. The visual result — the qmu
 * monochrome look, borders shed, inverted-pill hovers — is
 * unchanged; only the coupling is gone. A grouped source
 * rule (`a,b{…}`) becomes one slot per selector: identical
 * computed style, no shared `pm-*` selector list.
 *
 * The transitions/active-press feedback the demo also puts
 * on its OWN top-bar button (`.bo-topbar>button`) stays in
 * `demo1/styles.ts` — that is an app element, not a
 * framework slot.
 */
const hoverPill = ":not([aria-current=\"page\"]):hover";
const pressFeedback =
  "transition:background-color 0.15s ease,color 0.15s ease,border-color 0.15s ease,box-shadow 0.15s ease,transform 0.08s ease;";
const invertPill =
  "background:var(--pm-text);color:var(--pm-surface);";

export const demo1Slots: ReadonlyArray<SlotStyle> =
  [
    slotStyle({
      slot: "scheduler",
      declarations:
        "flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:0 1rem;",
    }),
    slotStyle({
      slot: "query",
      declarations:
        "width:100%;box-sizing:border-box;padding:0.35rem 0.5rem;margin:0.35rem 0;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);",
    }),
    slotStyle({
      slot: "col",
      declarations:
        "border-right:none;height:auto;",
    }),
    slotStyle({
      slot: "colHead",
      declarations:
        "border-bottom:none;background:transparent;color:var(--pm-text);border-radius:0;height:auto;padding:0;margin-bottom:0.5rem;justify-content:flex-start;",
    }),
    slotStyle({
      slot: "colHeadTitle",
      declarations:
        "background:transparent;color:var(--pm-text);border-radius:0;padding:0;margin:0;font-weight:700;font-size:0.95rem;flex:0 0 auto;text-decoration:none;",
    }),
    slotStyle({
      slot: "colHeadTitleLink",
      state: ":hover",
      declarations:
        "text-decoration:underline;",
    }),
    slotStyle({
      slot: "pane",
      declarations: "padding-top:0.25rem;",
    }),
    slotStyle({
      slot: "menuBody",
      declarations: "padding:0;border:none;",
    }),
    slotStyle({
      slot: "menuList",
      declarations:
        "list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.1rem;",
    }),
    slotStyle({
      slot: "menuLink",
      declarations:
        "display:inline-block;border:none;border-radius:3px;padding:0.1rem 0.35rem;margin-left:-0.35rem;background:transparent;color:var(--pm-text);text-decoration:none;font-size:0.95rem;line-height:1.35;",
    }),
    slotStyle({
      slot: "list",
      declarations:
        "margin:0;padding:0;border:1px solid var(--pm-border);border-radius:8px;background:var(--pm-surface);overflow:hidden;",
    }),
    slotStyle({
      slot: "listItem",
      declarations: "margin:0;",
    }),
    slotStyle({
      slot: "listItemAdjacent",
      declarations:
        "margin-top:0;border-top:1px solid var(--pm-border);",
    }),
    slotStyle({
      slot: "rowLink",
      declarations:
        "display:block;border:none;border-radius:0;background:transparent;padding:0.35rem 0.65rem;color:var(--pm-text);",
    }),
    slotStyle({
      slot: "menuLink",
      state: hoverPill,
      declarations: invertPill,
    }),
    slotStyle({
      slot: "rowLink",
      state: hoverPill,
      declarations: invertPill,
    }),
    slotStyle({
      slot: "menuLink",
      state: ":focus-visible",
      declarations: "outline-offset:0;",
    }),
    slotStyle({
      slot: "rowLink",
      state: ":focus-visible",
      declarations: "outline-offset:0;",
    }),
    slotStyle({
      slot: "listActions",
      declarations:
        "display:flex;flex-direction:column;margin:0 0 0.5rem 0;",
    }),
    slotStyle({
      slot: "listAction",
      declarations:
        "display:block;border:1px solid var(--pm-border);border-radius:8px;padding:0.5rem 0.65rem;background:var(--pm-surface);color:var(--pm-text);text-decoration:none;text-align:center;",
    }),
    slotStyle({
      slot: "listAction",
      state: hoverPill,
      declarations:
        "background:color-mix(in oklab,var(--pm-text) 8%,transparent);",
    }),
    slotStyle({
      slot: "formFirstChild",
      declarations: "margin-top:0;",
    }),
    slotStyle({
      slot: "form",
      declarations:
        "background:transparent;border:none;border-radius:0;padding:0;box-sizing:border-box;",
    }),
    slotStyle({
      slot: "btnPrimary",
      declarations:
        "background:transparent;color:var(--pm-text);border-color:var(--pm-text);",
    }),
    slotStyle({
      slot: "btnPrimary",
      state: ":hover",
      declarations: invertPill,
    }),
    slotStyle({
      slot: "colHasQuery",
      scope: ".bo-hidelist",
      declarations: "display:none;",
    }),
    slotStyle({
      slot: "colHasFields",
      scope: ".bo-hidelist",
      declarations: "display:none;",
    }),
    slotStyle({
      slot: "rowLink",
      scope: ".bo-results",
      state: hoverPill,
      within: ".bo-result-meta",
      declarations:
        "color:color-mix(in oklab,var(--pm-surface) 72%,transparent);",
    }),
    slotStyle({
      slot: "list",
      scope: ".bo-results",
      declarations:
        "border:none;background:transparent;border-radius:0;overflow:visible;",
    }),
    slotStyle({
      slot: "listItemAdjacent",
      scope: ".bo-results",
      declarations:
        "border-top:none;margin-top:0.35rem;",
    }),
    slotStyle({
      slot: "rowLink",
      scope: ".bo-results",
      declarations:
        "padding:0.1rem 0.35rem;border-radius:3px;",
    }),
    slotStyle({
      slot: "field",
      declarations: "margin:0;",
    }),
    slotStyle({
      slot: "fieldAdjacent",
      declarations: "margin-top:0.3rem;",
    }),
    slotStyle({
      slot: "fieldLabel",
      declarations:
        "font-size:0.72rem;margin-bottom:0.1rem;color:color-mix(in oklab,var(--pm-text) 58%,transparent);",
    }),
    slotStyle({
      slot: "input",
      declarations:
        "padding:0.2rem 0.4rem;font-size:0.82rem;border-radius:5px;",
    }),
    slotStyle({
      slot: "formBtnPrimary",
      declarations:
        "display:inline-block;width:auto;align-self:flex-start;margin-top:0.5rem;padding:0.25rem 0.7rem;font-size:0.82rem;border-radius:5px;",
    }),
    slotStyle({
      slot: "paneLink",
      state: "[aria-current=\"page\"]",
      declarations:
        "background:var(--pm-text);color:var(--pm-surface);box-shadow:none;",
    }),
    slotStyle({
      slot: "menuLink",
      declarations: pressFeedback,
    }),
    slotStyle({
      slot: "rowLink",
      declarations: pressFeedback,
    }),
    slotStyle({
      slot: "listAction",
      declarations: pressFeedback,
    }),
    slotStyle({
      slot: "colHeadTitleBare",
      declarations: pressFeedback,
    }),
    slotStyle({
      slot: "menuLink",
      state: ":active",
      declarations: "transform:scale(0.97);",
    }),
    slotStyle({
      slot: "rowLink",
      state: ":active",
      declarations: "transform:scale(0.97);",
    }),
    slotStyle({
      slot: "listAction",
      state: ":active",
      declarations: "transform:scale(0.97);",
    }),
    // The per-content column WIDTHS of the horizontal
    // runway: app layout choices, declared through the
    // framework's row/col slots rather than by naming
    // `.pm-row .pm-col` (the runway BEHAVIOUR is the
    // framework's `runwayCss`/`advanceColumns`; these are the
    // reference's width config over it).
    slotStyle({
      slot: "rowCol",
      declarations: "flex:0 0 240px;width:240px;",
    }),
    slotStyle({
      slot: "rowColHasMenu",
      declarations:
        "flex:0 0 auto;width:fit-content;max-width:190px;",
    }),
    slotStyle({
      slot: "rowColHasForm",
      declarations: "flex:0 0 380px;width:380px;",
    }),
    slotStyle({
      slot: "rowCol",
      state: ":has(.bo-search-condition)",
      declarations: "flex:0 0 200px;width:200px;",
    }),
    slotStyle({
      slot: "rowCol",
      state: ":has(.bo-results)",
      declarations:
        "flex:0 0 auto;width:fit-content;max-width:220px;",
    }),
    slotStyle({
      slot: "rowCol",
      state: ":has(.bo-trail-detail)",
      declarations:
        "flex:0 0 auto;width:fit-content;max-width:220px;",
    }),
  ];

/**
 * The demo's `Theme`: the branded monochrome default with
 * demo 1's component slots attached. The color scheme,
 * metrics, and chrome are untouched — only `slots` differs,
 * so the framework emitters produce the same output plus the
 * slot block.
 */
export const demo1Theme: Theme = {
  ...pragmaticTheme,
  slots: demo1Slots,
};
