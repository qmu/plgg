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

## Round E1 review — adopted; one flaw in the design itself

Seen in the demo: at rest the panel is the text it was; selecting
North on the board lights its line with the ink bar; hovering a line
underlines its changeable words and emphasises its subject on the
board; clicking `->` reversed North → Lower and the text followed;
the 「テキスト」 toggle is in the head.

The flaw is the reviewer's: the ghost words (`animated`, `route`)
that appear on hover sit exactly where a row's free space is, so a
click meant to select the row toggles `animated`. For E2:
- ghosts appear only on a row that is already selected, after a gap
  of two characters, in the pencil tone, each prefixed with `+`
  (`+animated`, `+step`); a hovered, unselected row shows underlines
  only;
- a click anywhere on a row that is not on an underlined word or a
  ghost selects the row — including on the text itself (keyword,
  plain words);
- the row's × stays at the far right and needs the row selected too.

## Redesign (owner, 2026-11-24): plain lines above, properties below

The owner's picture is the ordinary editor one, not words that act:

> In the editor, lines are simply selectable. Under it a properties
> area appears where each property can be edited — a node's when a
> node line is selected, an edge's when an edge is selected, and for
> several objects, the properties they have in common, applied to all.

So the inline acts go. **Remove**: underlined words, ghost `+words`,
the popovers under tokens, number scrubbing on the text, the arrow
reversing on click. **Keep**: the text looking exactly as it does;
line ↔ board selection both ways (click, Shift-click, hover
emphasis); double-click / Enter to edit a line as text; the empty
last line; 「テキスト」; `printLines` as the single source of the text.

### The properties area

It sits at the bottom of the DSL panel, under an ink hairline, with
the panel's translucent background; the lines above scroll on their
own. Its head names what is selected (「ノード North」, 「エッジ North →
Lower」, 「3 個のノード」, 「2 本のエッジ」, 「ノード 2・エッジ 1」, or
「図全体」 when nothing is). Rows are label left, control right, in the
sheet's type; controls are the sheet's own (ink-bordered fields,
segmented buttons with the pressed state inverted, a select as an
ink-bordered list). Every change applies at once, is one undo step,
and the text above follows.

**A node**
- 名前 (rename; edges follow) · ラベル
- 位置 x / y / z — number fields stepping by the snap (arrow keys,
  Shift ×4); disabled with a note when a layout places the node
- 幅 / 高さ (whole squares; empty = fits the label)
- グループ (toggle) · 折りたたみ (toggle, groups only) · 親 (choice of
  groups, "なし")
- under `layout rooms`: one choice per axis (層 / 担当 / 環境 …)
- 値 (where the sheet uses values)
- 削除

**An edge**
- 始点 → 終点 with a 「向きを逆に」 button
- ラベル
- 経路: 直線 / 角丸 / 曲線 (segmented)
- アニメーション (toggle)
- 削除

**Several of one kind** — the same rows, minus those that only make
sense for one (名前, 始点/終点). A field whose values differ shows
「複数の値」 in the pencil tone; setting it sets all. Nodes also get
整列 (左・中央・右 / 上・中央・下) and 等間隔 (横・縦), which keep boxes
on the grid.

**Nodes and edges together** — only what both have: 削除, and the
count.

**Nothing selected: 図全体**
- 配置: なし / 階層（右へ）/ 階層（下へ）/ 部屋
- 奥行き (toggle, with 階層)
- 吸着: なし / 8 / 16 / 32
- under 部屋: each axis's attribute and its letter x / y / z (swap)
- 規則: 循環を禁止 (toggle), 出力数の上限 (number or none)

### Specs

Each control is a `Change` whose reprint differs only in that
property; several-selection applies to all and shows 「複数の値」 when
they differ; node + edge selection offers delete only; nothing
selected shows the sheet's own; rename keeps edges; position fields
are disabled under a layout; no inline act remains on the lines (a
click on any word selects the line).

## Redesign review — adopted

Seen in the demo: lines are plain and selectable; with nothing
selected the area shows 図全体 (配置, 吸着, 循環を禁止, 出力数の上限);
a node shows 名前 … 削除; an edge shows 接続, 向き, ラベル, 経路,
アニメーション, 削除; two edges selected show 「2 本のエッジ」 and
choosing 角丸 turned both to `step` in the text and on the board.
Reviewer's fixes after looking: the area was inset by a stray
`section` rule of the demo page, labels were cut at 5.5em, Shift-click
painted a text selection over the row, and a pressed button under the
pointer went blank.
