---
created_at: 2026-07-19T04:35:46+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort: 1h
commit_hash: cbba0d80
category: Changed
depends_on:
---

# plgg-md: frontmatter YAML parser rejects nested sequences (list-of-lists)

Dogfooding feedback from attempting to migrate an existing Markdown docs set onto
`plggpress` (which uses `plgg-md`).

## 8. Frontmatter YAML parser rejects nested sequences (medium)

`plgg-md`'s minimal frontmatter YAML parser fails on nested sequences — a list
whose items are themselves lists — halting the build with `frontmatter line N:
expected a '- ' sequence item`. This is a common shape in existing Markdown
ecosystems (for example, per-page `head:` metadata expressed as a list-of-lists,
as VitePress uses for injected `<head>` tags). Content that is otherwise valid
YAML cannot be migrated without editing the source frontmatter — which, for a
docs set whose pages must stay faithful, is not acceptable.

**Request:** support nested YAML sequences in the frontmatter parser (or document
a supported alternative for list-of-list metadata).

## Policies

- **workaholic:implementation** (objective-documentation) — the report cites the
  exact parser error and a concrete real-world frontmatter shape that triggers it.

## Quality Gate

- A frontmatter block containing a nested sequence (a list whose items are lists,
  e.g. a VitePress-style `head:` list-of-lists) parses successfully — verified by
  a parser test over that shape — or a supported alternative is documented.
