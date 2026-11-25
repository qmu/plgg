import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { some, none } from "plgg";
import { renderToString } from "plgg-view";
import {
  propertyList,
  propertyRow,
  choice,
  entry,
  toggle,
} from "plggmatic/Component/usecase/properties";

type Msg = Readonly<{ kind: "set" | "flip" }>;
const set = (): Msg => ({ kind: "set" });
const flip: Msg = { kind: "flip" };

const html = renderToString(
  propertyList<Msg>("図全体", [
    propertyRow(
      "snap",
      "吸着",
      choice<Msg>({
        name: "snap",
        value: "16",
        options: [
          { value: "0", label: "なし" },
          { value: "16", label: "16" },
        ],
        disabled: false,
        onChange: set,
      }),
    ),
    propertyRow(
      "acyclic",
      "循環を禁止",
      toggle<Msg>({
        name: "acyclic",
        on: true,
        onLabel: "オン",
        offLabel: "オフ",
        disabled: false,
        onToggle: flip,
      }),
    ),
    propertyRow(
      "max",
      "出力数の上限",
      entry<Msg>({
        name: "max",
        value: "",
        placeholder: some("なし"),
        numeric: true,
        disabled: false,
        onInput: set,
      }),
    ),
  ]),
);

test("a property list is a labelled group, and each row's name is a label for its one control", () =>
  all([
    check(html, toContain('role="group"')),
    check(html, toContain('aria-label="図全体"')),
    check(html, toContain('for="snap"')),
    check(html, toContain('id="snap"')),
    check(html, toContain('for="acyclic"')),
    check(html, toContain('for="max"')),
    check(
      html.split("pm-prop-control").length,
      toBe(4),
    ),
  ]));

test("a choice marks its current value; an entry says when digits are expected", () =>
  all([
    check(html, toContain('value="16" selected')),
    check(
      html,
      not(toContain('value="0" selected')),
    ),
    check(html, toContain('inputmode="numeric"')),
    check(html, toContain('placeholder="なし"')),
  ]));

test("a switch is a real switch, and says which way it stands in words", () => {
  const offHtml = renderToString(
    toggle<Msg>({
      name: "x",
      on: false,
      onLabel: "オン",
      offLabel: "オフ",
      disabled: true,
      onToggle: flip,
    }),
  );
  return all([
    check(html, toContain('role="switch"')),
    check(html, toContain('aria-checked="true"')),
    check(html, toContain("オン")),
    check(
      offHtml,
      toContain('aria-checked="false"'),
    ),
    check(offHtml, toContain("オフ")),
    check(offHtml, toContain("disabled")),
    check(
      renderToString(
        entry<Msg>({
          name: "y",
          value: "a",
          placeholder: none(),
          numeric: false,
          disabled: false,
          onInput: set,
        }),
      ),
      not(toContain("inputmode")),
    ),
  ]);
});
