# Doc conventions

How pages in this guide are structured, so the docs grow
consistently against the information architecture fixed
in T1.

## Page structure

Every package / API page follows the same order, so
readers always know where to look:

1. **Overview** — what the package is and where it sits
   in the family (one or two sentences, with links to the
   packages it builds on or pairs with).
2. **Install** — the `npm install` line and any `file:`
   dependencies, matching the standalone-package layout.
3. **Concepts** — the handful of ideas a reader needs
   before the API makes sense.
4. **API tables** — the exported functions and types,
   tabulated; package pages summarize the key exports,
   with each package's source as the source of truth.
5. **Examples** — runnable usage, building on the
   concepts above.

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

The nav and sidebar tree in `.vitepress/config.ts` is
fixed by T1. Content tickets fill pages under existing
nodes; they do not restructure navigation. If a genuinely
new node is needed, change the IA deliberately and update
this page alongside it.
