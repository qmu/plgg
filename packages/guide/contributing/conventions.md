# Doc conventions

How pages in this guide are structured, so the docs grow
consistently against the information architecture fixed
in T1.

## Page structure

Every package (Vocabulary) page leads with what writing an
app looks like, then names the terms, then explains — so a
reader sees the library in use before any rationale:

1. **Overview** — one paragraph: what the package is and
   where it sits in the family (links to the packages it
   builds on or pairs with).
2. **Writing an app with it** — the FIRST section after the
   overview: a short, correct example of using the
   library's terms, in plgg's data-last
   [`pipe`](/concepts/composition) style wherever the
   surface composes naturally (don't force `pipe` where the
   real API doesn't use it).
3. **Vocabulary** — a compact glance at the terms the
   library offers (its key exports, grouped by concern);
   each package's source is the source of truth.
4. **Why it exists / how it's organized / deeper API** —
   the rationale, architecture, and any longer worked
   examples, below the two sections above.

The reference implementation is
[`plgg-http`](/packages/plgg-http).

## Code samples come from real code

**Code samples must come from the real packages or the
tested examples — never invented snippets.** Pull them
from a package's source, its tests, or
[`packages/example`](/packages/example). This keeps the
guide honest: if a sample drifts from the code, the
build (T8) or a test catches it, rather than the reader.

When a sample is abbreviated for the page, link to the
full source so the reader can see it compile and run.

## Information architecture is the contract

The nav and sidebar tree lives in `site.config.ts`, whose
`LIBRARY_PACKAGES` / `sidebar` / `nav` data is validated
through plggpress's `defineSite`. Content tickets fill
pages under existing nodes; they do not restructure
navigation. If a genuinely new node is needed, change the
IA deliberately (add its `LIBRARY_PACKAGES` entry, or a
new sidebar section for a framework with several pages)
and update this page alongside it.

IA changes so far: 2026-07-05 added the former
plggmatic section and the `plgg-domain` / `plgg-parser`
Vocabulary leaves. 2026-07-09 removed the plggmatic
section after the package cluster moved to the standalone
plggmatic repository, and added current `plgg-ui` and
`plgg-cms` package leaves. Later the same day, the retired
content and MCP package leaves were removed from Vocabulary
after their source moved inside `plgg-cms`. A framework with
several pages gets its own sidebar section (like plggpress);
a single library gets one `LIBRARY_PACKAGES` leaf.
