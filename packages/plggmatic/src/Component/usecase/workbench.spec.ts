import { test, check, toBe } from "plgg-test";
import { some, none } from "plgg";
import { renderToString } from "plgg-view";
import {
  codeInput,
  rowList,
  splitter,
  statusLine,
} from "plggmatic/Component/usecase/workbench";

const same = (v: string): string => v;

test("a splitter is a named separator that says which way it divides", () =>
  check(
    renderToString(
      splitter({
        label: "パネルの幅を変える",
        orientation: "vertical",
      }),
    ),
    toBe(
      '<div class="pm-splitter" role="separator" aria-orientation="vertical" aria-label="パネルの幅を変える"></div>',
    ),
  ));

test("a row list selects exactly the chosen row and marks the wrong one", () =>
  check(
    renderToString(
      rowList({
        label: "ソース",
        rows: [
          { id: "1", text: "a", invalid: false },
          { id: "2", text: "b", invalid: true },
        ],
        selected: some("1"),
        onSelect: same,
      }),
    ),
    toBe(
      '<div class="pm-rows" role="listbox" aria-label="ソース"><div class="pm-rows-row" role="option" tabindex="0" aria-selected="true">a</div><div class="pm-rows-row" role="option" tabindex="0" aria-selected="false" aria-invalid="true">b</div></div>',
    ),
  ));

test("a code input is a labelled field that is never spell-checked", () =>
  check(
    renderToString(
      codeInput({
        name: "dsl",
        label: "図の DSL",
        value: "a -> b",
        onInput: same,
      }),
    ),
    toBe(
      '<textarea class="pm-code-input" name="dsl" aria-label="図の DSL" spellcheck="false" value="a -&gt; b">a -&gt; b</textarea>',
    ),
  ));

test("a status line is announced, and a failure is marked", () =>
  check(
    [
      renderToString(
        statusLine({
          text: "保存しました",
          tone: none(),
        }),
      ),
      renderToString(
        statusLine({
          text: "3 行目が読めません",
          tone: some("danger"),
        }),
      ),
    ].join("|"),
    toBe(
      '<output class="pm-status" aria-live="polite">保存しました</output>|<output class="pm-status" aria-live="polite" data-error="">3 行目が読めません</output>',
    ),
  ));
