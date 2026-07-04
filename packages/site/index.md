# plggmatic — a column-oriented UI design framework

plggmatic is a UI design framework built on the [plgg](https://github.com/qmu/plgg) family. It gives you three things as typed, composable data: a **column-oriented pane alignment system**, a **light/dark color scheme** driven by design tokens, and a small set of **fundamental components** that are pure functions returning plgg-view `Html`.

Start with [Getting started](/getting-started), read about the [color scheme](/color-scheme) and [pane alignment](/pane-alignment), or browse the [components](/components/button).

## Not the same as the old plggmatic

There was a previous `plggmatic` package inside the plgg monorepo — an internal re-export shim of plgg-view's builders. This framework reuses that name deliberately, but it is a different thing: a design framework layered on plgg-view, not a re-export. Where this documentation says "plggmatic," it means the framework described here.

## Column, Pane, Alignment, Token, Scheme

The framework holds to one word per concept. A screen is a row of **Columns**; each column stacks **Panes** (landmark content regions); their sizing and collapse is the **Alignment** system. Color, spacing, and type are **Tokens**; the light and dark sets of token values are **Schemes**. The same vocabulary is used across every page here and in the source.

## Built on plgg-view, styled by tokens

Components return plgg-view `Html<Msg>` and are styled only through the token utilities, so color reschemes with a single `dark` class on `<html>` and nothing renders state by color alone. Everything is server-rendered from pure data — there is no framework runtime to boot.
