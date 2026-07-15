---
created_at: 2026-07-15T18:03:22+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Changed
depends_on:
mission:
---

# Widen the YAML subset to the front matter this repo actually writes, and open a heading seam

## Overview

Two independent additive gaps in `plgg-md`, found by running the published
parser over real corpora rather than by reading the spec. Neither is a bug —
both are deliberate bounds meeting a case they were not drawn for. They are
filed together only because they land in one package and would ideally ride
one release; **decide and land them separately** if that reads cleaner.

The evidence for part 1 is this repository's own knowledge base.

## Findings

### 1. `parseYamlSubset` rejects 71% of this repo's own `.workaholic/` front matter

Measured against `packages/plgg-md` as published (0.0.2), over `plgg/.workaholic/**/*.md`:

```
total=661  ok=189  ERR=472   (71% rejected)

  353x  frontmatter line N: unsupported YAML construct starting with "["
   96x  frontmatter line N: key "resolved_by_pr" has no value
   15x  frontmatter line N: key "resolved_by_commit" has no value
    6x  frontmatter line N: key "mission" has no value
    1x  frontmatter line N: key "reviewed-by" has no value
    1x  frontmatter line N: key "reviewed_by" has no value
```

Two constructs account for all of it, and both are standard ticket-format shape:

- **Flow sequences** — `layer: [UX]`, `layer: [Domain, Infrastructure]`.
  `EXCLUDED_LEAD = "&*!|>[{"` (`Yaml/usecase/parseYamlSubset.ts:85`) excludes `[`
  and `{`; the error is raised at `:127`. The block form (`- UX` on indented
  lines) parses fine — this is purely a spelling the parser does not accept.
- **Empty values** — `commit_hash:`, `depends_on:`, `effort:`, `resolved_by_pr:`.
  Raised at `parseYamlSubset.ts:276` (`key … has no value`). Every ticket in this
  repo carries several by template.

**This ticket's own front matter is one of the 472** — `layer: [Infrastructure]`
on line 5 is rejected by the parser it is filed against.

Worth stating plainly: the exclusion is **deliberate and security-motivated**.
`YamlValue.ts`'s doc comment is normative and says the subset is *"deliberately
bounded so it is fail-closed against untrusted author input"*. That reasoning is
sound for most of `EXCLUDED_LEAD` — `&`/`*` (alias expansion), `!!` (tag/type
coercion), `<<` (merge keys) are genuine attack surface, and a billion-laughs
document is exactly what fail-closed should stop.

`[` and `{` are not in that class. A flow sequence of scalars is the same value
as the block sequence already supported (`YSeq` of `YScalar`), written on one
line. It carries no expansion, no aliasing, no type coercion — it is surface
sugar over a shape `YValue` already models. The one-level bound can hold exactly
as it does today: a flow sequence of scalars is admissible, a nested or mapping
flow collection stays an error. Same for `key:` with no value — `None` is a
value the model already has.

So the ask is **not** "loosen the bound". It is: the bound as drawn excludes two
spellings that are inside it semantically, and the corpus that proves it is this
repo's.

### 2. `renderHeading` is unreachable, so heading numbering cannot be built on `plgg-md`

`RenderOptions` (`Render/model/seam.ts:87-92`) exposes exactly four seams:

```ts
export type RenderOptions = Readonly<{
  highlighter: Highlighter;
  resolveLink: LinkResolver;
  rawHtml: boolean;
  slug: SlugFn;
}>;
```

`renderHeading` is `const`, not `export const` (`Render/usecase/mdToHtml.ts:249`,
called at `:304`), so it cannot be reached from outside the package. A consumer
wanting numbered headings (`1-2.`, `3-1-2.` — a common docs requirement, and
something the guide or any plggpress site could adopt) has no way to own the
heading element short of reimplementing block rendering over the public
`parseBlocks` AST.

A `decorateHeading`-style seam alongside `slug` would cover it. The counter I can
see: `slug` already threads per-document state via `makeSluggers`, so a numbering
counter has an established shape to follow — but it also means **the one-run
invariant applies**. `MarkdownDoc`'s doc comment protects it for slugs because
`headings` and `body` share a single slugger run; a heading number computed in a
second, independent run would drift from the one rendered in the body, and the
drift would surface far from here as a citation mismatch. Whatever the seam's
shape, it should make one run the only way to use it.

## Considerations

- **Part 1 is not a `golden.spec.ts` re-pin.** It admits documents that are
  errors today; nothing currently parsing changes meaning. That is unlike
  `20260715015058-plgg-md-parser-bugs-found-during-swap.md`, where each fix moves
  rendered bytes on purpose. The new-acceptance cases want their own specs.
- **`YamlValue.ts`'s doc comment is the normative spec** and must move with the
  code, in the same commit — its EXCLUDED list is the contract consumers read.
  Leaving it describing the old bound would be worse than the gap.
- **Please keep the rest of `EXCLUDED_LEAD` closed.** The ask is `[` and `{`
  holding scalars, plus empty-as-`None` — not anchors, tags, merges, or block
  scalars. If admitting `{` for one-level maps complicates the fail-closed
  argument, dropping it and taking `[` alone still clears 353 of the 472.
- **Consumers behind an npm `min-release-age` floor pay the wait once per
  release**, which is the only reason these two are in one ticket. If they land
  separately that is fine — but landing them in one published version saves
  every such consumer a second wait.
- Part 2 is a design question more than a code change; a rejection with a
  recorded reason would be just as useful as a seam.

## Verification

Both findings are reproducible against the published package, no checkout needed:

```sh
mkdir /tmp/y && cd /tmp/y && npm init -y >/dev/null && npm install plgg-md@0.0.2
node --input-type=module -e '
import { parseFrontmatter } from "plgg-md";
const t = (fm) => {
  const r = parseFrontmatter(`---\n${fm}\n---\nx`);
  console.log(r.__tag === "Err" ? `ERR  ${r.content.content.message}` : "OK  ", "|", JSON.stringify(fm));
};
t("layer: [UX]");            // ERR unsupported YAML construct starting with "["
t("layer:\n  - UX");         // OK   (same value, block spelling)
t("commit_hash:");           // ERR key "commit_hash" has no value
t("created_at: 2026-07-15T18:03:22+09:00");  // OK (unquoted dates are fine)
'
```

The corpus number reproduces by running `parseFrontmatter` over
`.workaholic/**/*.md` and counting `__tag === "Err"`. Note the `Result`
discriminator is `__tag`, not `ok`/`_tag` — a checker guessing the wrong one
reports every file as passing.

## Related

- `20260715015058-plgg-md-parser-bugs-found-during-swap.md` — the open block/inline
  grammar bugs. Disjoint from this (that is CommonMark block parsing; this is the
  YAML subset and the render seam), but the same package and the same golden gate.
- `packages/plgg-md/src/Yaml/model/YamlValue.ts` — the normative subset spec.
- `packages/plgg-md/src/Render/model/seam.ts` — the four current seams.
