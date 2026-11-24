// @plgg-test-environment dom
import { test, check, toBe, vi } from "plgg-test";
import {
  createFlow,
  type Change,
} from "plgg-flow";
import {
  printSpec,
  selectSubject,
  type Subject,
} from "plgg-flow/dsl";
import { makeRenderer } from "plgg-view/client";
import {
  readSheetSource,
  sheetDsl,
} from "plgg-ir-diagram/flowSheet";

const node = (id: string): Subject => ({
  kind: "node",
  id,
});
const edge = (index: number): Subject => ({
  kind: "edge",
  index,
});
const inspect = (
  source: string,
  subjects: readonly Subject[],
) => {
  let state = readSheetSource(
    source,
    createFlow({ nodes: [], edges: [] }),
    [],
  );
  state = {
    ...state,
    flow: subjects.reduce(
      (f, s) => selectSubject(s, true)(f),
      state.flow,
    ),
  };
  const root = document.createElement("div");
  let commits = 0;
  const render = makeRenderer<() => void>(
    root,
    (fn) => fn(),
  );
  const printed = () =>
    printSpec(state.flow, state.rules);
  const draw = () =>
    render(
      sheetDsl(
        state.flow,
        state.rules,
        (fn: Change) => () => {
          state = {
            ...state,
            flow: fn(state.flow),
          };
        },
        printed(),
        state.error,
        () => {},
        (s, edited) => () => {
          commits++;
          state = readSheetSource(
            s,
            state.flow,
            state.rules,
            edited,
          );
        },
      ),
    );
  draw();
  const control = (label: string) =>
    Array.from(
      root.querySelectorAll("[aria-label]"),
    ).find(
      (c) =>
        c.getAttribute("aria-label") === label,
    );
  const act = (label: string, v?: string) => {
    const c = control(label);
    if (!c || c.hasAttribute("disabled"))
      return false;
    if (
      v !== undefined &&
      (c instanceof HTMLInputElement ||
        c instanceof HTMLSelectElement)
    )
      c.value = v;
    c.dispatchEvent(
      new MouseEvent(
        v === undefined ? "click" : "change",
        { bubbles: true },
      ),
    );
    draw();
    return true;
  };
  return {
    root,
    control,
    act,
    printed,
    commits: () => commits,
    dispose: render.dispose,
  };
};

type Case = readonly [
  source: string,
  subjects: readonly Subject[],
  label: string,
  value: string | undefined,
  expected: string,
];
const single = [node("A")],
  wire = [edge(0)];
const cases: readonly Case[] = [
  [
    "node A at 0 0\nA -> B",
    single,
    "名前",
    "C",
    "node C at 0 0\nnode B at 0 0\nC -> B",
  ],
  [
    "node A at 0 0",
    single,
    "ラベル",
    "別名",
    'node A at 0 0 label "別名"',
  ],
  ...(
    ["x", "y", "z"] satisfies ("x" | "y" | "z")[]
  ).map(
    (axis): Case => [
      "node A at 0 0",
      single,
      "位置 " + axis,
      "32",
      "node A at " +
        (axis === "x"
          ? "32 0"
          : axis === "y"
            ? "0 32"
            : "0 0 32"),
    ],
  ),
  [
    "node A at 0 0",
    single,
    "幅",
    "5",
    "node A at 0 0 width 80",
  ],
  [
    "node A at 0 0 height 64",
    single,
    "高さ",
    "",
    "node A at 0 0",
  ],
  [
    "node A at 0 0",
    single,
    "グループ",
    undefined,
    "node A at 0 0 group",
  ],
  [
    "node A at 0 0 group",
    single,
    "折りたたみ",
    undefined,
    "node A at 0 0 group collapsed",
  ],
  [
    "node G at 0 0 group\nnode A at 0 0",
    single,
    "親",
    "G",
    "node G at 0 0 group\nnode A at 0 0 in G",
  ],
  [
    "node A at 0 0 value 2",
    single,
    "値",
    "8",
    "node A at 0 0 value 8",
  ],
  [
    "layout rooms\naxis x 層 一 二\nnode A 層=一",
    single,
    "層",
    "二",
    "layout rooms\naxis x 層 一 二\nnode A 層=二",
  ],
  [
    "layout layered down\nA -> B",
    wire,
    "始点",
    "B",
    "layout layered down\nnode A\nB -> B",
  ],
  [
    "layout layered down\nA -> B",
    wire,
    "終点",
    "A",
    "layout layered down\nnode B\nA -> A",
  ],
  [
    "layout layered down\nA -> B",
    wire,
    "向きを逆に",
    undefined,
    "layout layered down\nB -> A",
  ],
  [
    "layout layered down\nA -> B",
    wire,
    "ラベル",
    "条件",
    'layout layered down\nA -> B "条件"',
  ],
  ...["直線", "角丸", "曲線"].map(
    (label, i): Case => [
      "layout layered down\nA -> B",
      wire,
      "経路 " + label,
      undefined,
      "layout layered down\nA -> B " +
        ["straight", "step", "curve"][i],
    ],
  ),
  [
    "layout layered down\nA -> B",
    wire,
    "アニメーション",
    undefined,
    "layout layered down\nA -> B animated",
  ],
  [
    "layout layered down\nA -> B",
    [],
    "配置",
    "right",
    "layout layered right\nA -> B",
  ],
  [
    "layout layered down",
    [],
    "奥行き",
    undefined,
    "layout layered down depth",
  ],
  ["snap 32", [], "吸着", "0", "snap off"],
  [
    "",
    [],
    "循環を禁止",
    undefined,
    "rule acyclic",
  ],
  [
    "rule acyclic",
    [],
    "出力数の上限",
    "3",
    "rule acyclic\nrule max-outputs 3",
  ],
  [
    "rule max-outputs 3",
    [],
    "出力数の上限",
    "",
    "",
  ],
  [
    "layout rooms\naxis x 層 一",
    [],
    "x 軸の属性",
    "担当",
    "layout rooms\naxis x 担当 一",
  ],
  [
    "layout rooms\naxis x 層 一\naxis y 担当 人",
    [],
    "x 軸の文字",
    "y",
    "layout rooms\naxis y 層 一\naxis x 担当 人",
  ],
];
for (const [
  source,
  subjects,
  label,
  value,
  expected,
] of cases) {
  test(
    label +
      " commits one property edit: " +
      expected,
    () => {
      const sheet = inspect(source, subjects);
      sheet.act(label, value);
      const result = sheet.printed();
      const count = sheet.commits();
      sheet.dispose();
      return check(
        [count, result].join("\n"),
        toBe("1\n" + expected),
      );
    },
  );
}
test("mixed fields apply to the entire selection and retain the selected wires", () => {
  const sheet = inspect(
    "layout layered down\nA -> B straight\nA -> B curve",
    [edge(0), edge(1)],
  );
  const mixed =
    sheet.root.textContent?.includes("複数の値");
  sheet.act("経路 角丸");
  sheet.act("アニメーション");
  const result = sheet.printed();
  sheet.dispose();
  return check(
    !!mixed &&
      result ===
        "layout layered down\nA -> B step animated\nA -> B step animated",
    toBe(true),
  );
});
test("node selection shows mixed labels and aligns and distributes box edges on the grid", () => {
  const sheet = inspect(
    "node A at 32 16\nnode B at 99 32\nnode C at 160 48",
    [node("A"), node("B"), node("C")],
  );
  const mixed =
    sheet
      .control("ラベル")
      ?.getAttribute("placeholder") ===
    "複数の値";
  sheet.act("縦整列 上");
  sheet.act("横に等間隔");
  sheet.act("ラベル", "統一");
  const result = sheet.printed();
  sheet.dispose();
  return check(
    mixed &&
      result ===
        'node A at 32 16 label "統一"\nnode B at 96 16 label "統一"\nnode C at 160 16 label "統一"',
    toBe(true),
  );
});
test("mixed selection offers only deletion and returns to diagram properties", () => {
  const sheet = inspect(
    "layout layered down\nA -> B",
    [node("A"), edge(0)],
  );
  const count = sheet.root
    .querySelector(".dsl-properties")
    ?.querySelectorAll("button").length;
  const mixed =
    sheet.root.textContent?.includes(
      "ノード 1・エッジ 1",
    ) && !sheet.control("ラベル");
  sheet.act("選択を削除");
  const entire =
    sheet.root.textContent?.includes("図全体") &&
    !!sheet.control("配置");
  sheet.dispose();
  return check(
    count === 1 && !!mixed && !!entire,
    toBe(true),
  );
});
test("layout-owned positions are disabled with an explanation", () => {
  const sheet = inspect(
    "layout layered right\nA -> B",
    single,
  );
  const disabled =
    sheet
      .control("位置 x")
      ?.hasAttribute("disabled") &&
    sheet.root.textContent?.includes(
      "配置で指定",
    );
  sheet.dispose();
  return check(!!disabled, toBe(true));
});

test("position arrows use snap and Shift advances four steps in one edit", () => {
  vi.stubGlobal("KeyboardEvent", Event);
  const sheet = inspect(
    "snap 8\nnode A at 0 0",
    single,
  );
  try {
    const field = sheet.control("位置 x");
    field?.dispatchEvent(
      Object.assign(
        new Event("keydown", {
          bubbles: true,
          cancelable: true,
        }),
        { key: "ArrowUp", shiftKey: true },
      ),
    );
    return check(
      [sheet.commits(), sheet.printed()].join(
        "\n",
      ),
      toBe("1\nsnap 8\nnode A at 32 0"),
    );
  } finally {
    sheet.dispose();
    vi.unstubAllGlobals();
  }
});
