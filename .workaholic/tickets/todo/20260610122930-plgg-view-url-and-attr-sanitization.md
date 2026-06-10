---
created_at: 2026-06-10T12:29:30+09:00
author: a@qmu.jp
type: bugfix
layer: [UX]
effort:
commit_hash:
category:
depends_on:
---

# Sanitize URL schemes, reject `on*` attribute names, validate SSR tag names

## Overview

Three related view-layer rendering-safety gaps, all in the `plgg-view` escape /
attribute / SSR path. Each requires an app to use a generic escape hatch
(`attr`/`href`/`el`) with untrusted data, so they are misuse-enabling gaps rather
than default-path bugs — but the library's allow-list discipline can close them
cheaply, consistent with how `isSafeAttrName` already blocks attribute-name
injection.

1. **`javascript:` URLs (MEDIUM):** `escapeAttr` stops quote-breakout but not
   scheme abuse. `a([href(userLink)], …)` with `href = "javascript:…"` executes
   on click, both SSR and client. No URL-scheme sanitization exists for
   URL-bearing attributes.
2. **`on*` event-handler attribute names (MEDIUM):** `isSafeAttrName` permits
   `onclick`/`onerror`/`onload`. Client-side `setAttribute("onerror", val)`
   installs a working handler; SSR emits an event handler with an attacker-
   influenced value. The typed `onClick`/`onInput` helpers are unaffected (they
   use the `Handler` channel) — this only bites the generic `attr()` hatch.
3. **Unescaped SSR tag name (LOW):** `renderToString` interpolates `tag` raw, so
   the documented `el(tag, …)` escape hatch with an untrusted tag yields raw
   markup injection on the server (the client `createElement` throws on invalid
   names, so client is safe).

## Key Files

- `packages/plgg-view/src/Html/usecase/escape.ts` (`isSafeAttrName` lines 33-36) — add `on*` rejection; home for a new URL-scheme sanitizer.
- `packages/plgg-view/src/Html/model/Attribute.ts` (`href` line 143-145; generic `attr` line 101) — URL-bearing attribute builders.
- `packages/plgg-view/src/Html/usecase/renderToString.ts` (lines 52, 78-84) — applies `isSafeAttrName` for names; tag interpolation to guard.
- `packages/plgg-view/src/Program/usecase/render.ts` (`setStaticAttr` ~line 201-210) — client-side `setAttribute`; must enforce the same name/URL guards as SSR.

## Implementation Steps

1. Add a URL sanitizer (e.g. `safeUrl` in `escape.ts`) that allows only `http:`/`https:`/`mailto:`/`tel:` and relative URLs, neutralizing `javascript:`, `data:`, `vbscript:`. Apply it to URL-bearing attributes (`href`, `src`, `action`, `formaction`, `poster`, `xlink:href`) in both SSR (`renderAttribute`) and client (`setStaticAttr`). Drop/neutralize disallowed schemes rather than emit them.
2. Extend `isSafeAttrName` to additionally reject names matching `/^on/i` (event handlers). Keep the existing structural allow-list. This is enforced in both SSR and client attribute paths, so both inherit it.
3. Run `tag` through a tag-name validator (reuse `isSafeAttrName` or a tag allow-list) in `renderToString` before interpolation; drop/escape invalid tags so the `el()` hatch cannot inject markup on the server.
4. Tests: `href("javascript:alert(1)")` renders inert in SSR and client; `attr("onerror", x)` is dropped; `el("div onload=x", …)` cannot inject markup via SSR.

## Considerations

- The SPA click guard `isHttp` (`application.ts` ~line 135) governs only navigation interception, not what gets rendered — it is **not** a substitute for render-time URL sanitization. Document that distinction.
- **Preferring Rich Typing** (`standards:implementation`): the strongest version narrows URL-bearing attributes and tag/attr names to safe-by-construction types rather than re-validating at each sink — consider whether `href`/`src` should take a validated URL type instead of raw `SoftStr`. At minimum, enforce in one shared place so SSR and client cannot drift. (`packages/plgg-view/src/Html/usecase/escape.ts`)
- **Accessibility for Humans and AI** (`standards:design`/`standards:implementation`): keep legitimate `mailto:`/`tel:`/relative links working — the allow-list must not break valid reachable navigation.
- SSR and client must enforce identical rules or an attacker picks the weaker path; assert parity in tests. (`renderToString.ts`, `render.ts`)
- Strict no-`as`/`any`/`ts-ignore` (CLAUDE.md); keep coverage >90% across the new drop branches.
