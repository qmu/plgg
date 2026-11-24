# The DSL panel as an editor — looks like a text area, behaves like the sheet

Owner's brief (2026-11-24): the DSL panel should look like a text
area at first sight but be a GUI editor in a text area's clothes —
select a node or an edge and its line lights up; click a line's
important words to change them.

It stays text: what is shown is exactly what `printSpec` prints, in
the same monospace, with no boxes or icons at rest. The structure
only shows when touched.

## Lines are things

`printSpec` gains a structured sibling, `printLines(flow, rules)`,
returning one record per line:

```ts
type Line = Readonly<{
  subject:
    | { kind: "node"; id: string }
    | { kind: "edge"; index: number }
    | { kind: "directive"; name: "layout" | "axis" | "snap" | "rule" };
  tokens: readonly Token[];   // their texts joined by " " = the line
}>;
type Token = Readonly<{
  text: string;
  role:
    | "keyword" | "name" | "arrow" | "label"
    | "number" | "route" | "flag" | "attribute" | "value" | "plain";
  /** what a click on it does; absent = not clickable */
  act?: Act;
}>;
```

`printSpec` is `printLines(...).map(join).join("\n")` — one source of
truth, so text and rows can never disagree.

## Selection goes both ways

- Selecting a node or an edge on the board highlights its line (the
  wash tone across the row, an ink bar 2px at its left); several
  selected, several lines. The panel scrolls the first into view.
- Clicking a line's free space selects its node or edge on the board
  (Shift-click adds, as on the board). Hovering a line shows its
  subject faintly emphasised on the board.
- A directive line selects nothing; it just takes the row highlight
  while the pointer is on it.

## Words that can be changed by a click

On the row under the pointer, clickable tokens get a dotted
underline; nothing else changes at rest.

| Token | Click |
|---|---|
| route word on an edge (`straight` / `step` / `curve`), or its absence | a three-way choice in place; picks apply at once |
| `animated` on an edge | toggles; an edge without it shows a ghost `animated` on hover to add |
| `->` | reverses the edge |
| `"label"` (edge label, node `label`) | becomes an inline field; Enter applies, Esc cancels |
| numbers after `at` (x y z), `width`, `height`, `value` | inline field; dragging sideways on the number scrubs it in steps of the snap (16), Shift = ×4 |
| `group`, `collapsed` | toggle |
| `in Parent` | a choice of the sheet's groups (and "none") |
| a rooms attribute value (`層=入口`) | a choice of that axis's values |
| `layout layered right` / `down`, `depth` | cycle / toggle |
| `axis x` letter | cycles x → y → z, swapping with the axis that held the letter — turning the classification with one click |
| `snap 16` | choice of off / 8 / 16 / 32 |
| a node's name | inline rename (edges follow) |

Every act is a pure `Change` on the flow; the text is reprinted from
the result.

## Still a text area when you want one

- Double-click a row (or press Enter / F2 on a selected row): that
  row becomes a plain text field holding the line. Enter applies it
  through `parseSpec` on the whole text with that line replaced;
  an error marks the row and shows the message under the panel, the
  sheet keeps its last good state (as today).
- The last row is always an empty line: typing there adds a line.
- Backspace on an empty row, or the × that appears at a row's right
  end on hover, deletes the line (and so the node or edge).
- A 「テキスト」 toggle in the panel head swaps the rows for the real
  text area (for pasting or rewriting a lot at once) and back.
- Keyboard: ↑ ↓ move the selected row, Tab moves between a row's
  clickable tokens, Enter acts.

## Where it lives

In the shared flow sheet module (the one the demo and the plggpress
`plgg-flow` part both use), so both get it.

## Specs

`printLines` joins to `printSpec` for every demo sample; each act is
a `Change` whose reprint differs only in the acted token; selection
maps line ↔ subject both ways for nodes, edges, parallel edges and
self-loops; a row edit that fails to parse leaves the flow untouched.
