import {
  test,
  check,
  toBe,
  toEqual,
} from "plgg-test";
import { some, none } from "plgg";
import { renderToString } from "plgg-view";
import {
  dateInput,
  fileInput,
  numberInput,
  radioGroup,
  searchField,
  segmented,
  slider,
  suggestInput,
  checkGroup,
  toggled,
} from "plggmatic/Component/usecase/choices";

const two = [
  { id: "a", label: "月" },
  { id: "b", label: "年" },
];
const same = (v: string): string => v;

test("a radio group is real radios under one name, the chosen one checked", () =>
  check(
    renderToString(
      radioGroup({
        name: "unit",
        label: "単位",
        options: two,
        value: "b",
        onChange: same,
      }),
    ),
    toBe(
      '<fieldset class="pm-radios"><legend class="pm-field-label">単位</legend><label class="pm-radio"><input type="radio" name="unit" value="a" /><span>月</span></label><label class="pm-radio"><input type="radio" name="unit" value="b" checked="" /><span>年</span></label></fieldset>',
    ),
  ));

test("a segmented control presses exactly the chosen one", () =>
  check(
    renderToString(
      segmented({
        label: "単位",
        options: two,
        value: "a",
        onSelect: same,
      }),
    ),
    toBe(
      '<div class="pm-segmented" role="group" aria-label="単位"><button type="button" class="pm-segment" aria-pressed="true">月</button><button type="button" class="pm-segment" aria-pressed="false">年</button></div>',
    ),
  ));

test("a number input writes only the bounds it was given", () =>
  check(
    renderToString(
      numberInput({
        name: "n",
        label: "数",
        value: "3",
        error: none(),
        disabled: false,
        min: some(0),
        max: none(),
        step: none(),
        onInput: same,
      }),
    ),
    toBe(
      '<div class="pm-field"><label for="n" class="pm-field-label">数</label><input id="n" name="n" type="number" value="3" class="pm-input" inputmode="decimal" min="0" /></div>',
    ),
  ));

test("a date input in error names its error", () =>
  check(
    renderToString(
      dateInput({
        name: "d",
        label: "日",
        value: "",
        error: some("要ります"),
        disabled: true,
        onInput: same,
      }),
    ).includes('aria-invalid="true"'),
    toBe(true),
  ));

test("a search field is labelled without drawing the label", () =>
  check(
    renderToString(
      searchField({
        name: "q",
        label: "絞り込む",
        value: "",
        placeholder: "名前で",
        onInput: same,
      }),
    ),
    toBe(
      '<div class="pm-search" role="search"><input type="search" name="q" value="" placeholder="名前で" aria-label="絞り込む" class="pm-input" /></div>',
    ),
  ));

test("a slider writes its value beside it", () =>
  check(
    renderToString(
      slider({
        name: "s",
        label: "濃さ",
        value: 40,
        min: 0,
        max: 100,
        step: 10,
        onInput: same,
      }),
    ),
    toBe(
      '<div class="pm-field"><label for="s" class="pm-field-label">濃さ</label><div class="pm-range"><input id="s" name="s" type="range" min="0" max="100" step="10" value="40" /><output for="s" class="pm-range-value">40</output></div></div>',
    ),
  ));

test("a file input accepts only what it was told to", () =>
  check(
    renderToString(
      fileInput({
        name: "f",
        label: "ファイル",
        accept: some(".csv"),
        onChange: same,
      }),
    ),
    toBe(
      '<div class="pm-field"><label for="f" class="pm-field-label">ファイル</label><input id="f" name="f" type="file" class="pm-input" accept=".csv" /></div>',
    ),
  ));

test("a suggesting input is a text field tied to its list of suggestions", () =>
  check(
    renderToString(
      suggestInput({
        name: "city",
        label: "都市",
        value: "東",
        error: none(),
        disabled: false,
        options: ["東京", "大阪"],
        onInput: same,
      }),
    ).includes(
      'list="city-options" autocomplete="off" /><datalist id="city-options"><option value="東京"></option><option value="大阪"></option></datalist>',
    ),
    toBe(true),
  ));

test("a check group checks every chosen one and no other", () =>
  check(
    renderToString(
      checkGroup({
        name: "unit",
        label: "単位",
        options: two,
        chosen: ["b"],
        onToggle: same,
      }),
    ),
    toBe(
      '<fieldset class="pm-checks"><legend class="pm-field-label">単位</legend><label class="pm-checks-item"><input type="checkbox" name="unit" value="a" class="pm-checkbox" /><span>月</span></label><label class="pm-checks-item"><input type="checkbox" name="unit" value="b" class="pm-checkbox" checked="" /><span>年</span></label></fieldset>',
    ),
  ));

test("pressing a chosen one takes it away; pressing another adds it", () =>
  check(
    [
      toggled(["a", "b"], "a"),
      toggled(["a"], "b"),
    ],
    toEqual([["b"], ["a", "b"]]),
  ));
