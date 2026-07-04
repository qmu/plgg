# plggmatic

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

A **column-oriented UI design framework** on the plgg family: a typed light/dark
**color scheme** (roles resolved through `var(--pm-*)` custom properties, so one
`dark` class reschemes the whole tree), **layout combinators** (`row` / `column`
/ `pane`) composed like element builders take `(parts, children)`, and
**fundamental components** as pure `(props) => Html<Msg>`. Styling is data —
atoms composed through [plgg-view](../plgg-view/)'s `style_`, gathered by
`collectCss`. No layout config object and no runtime to boot.

The vocabulary is one word per concept: **Column**, **Pane**, **Alignment**,
**Token**, **Scheme**. The design system is emergent — seeded minimal, one
recorded rule per component.

This is the UI design framework — distinct from the app-framework facade that
[plggpress](../plggpress/) absorbed. See the documentation site in
[`packages/site/`](../site/) and the workbench demo in
[`packages/plggmatic-example/`](../plggmatic-example/).
