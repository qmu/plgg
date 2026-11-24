import {
  sessionControls,
  type Session,
  type Action,
} from "plgg-ir-diagram/sheetSession";
import {
  insertOnEdge,
  viewAt,
  type Flow,
  type Change,
} from "plgg-flow";
import {
  el,
  attr,
  onClick,
  text,
  type Html,
} from "plgg-view";

type FlowTool = Readonly<{
  name: string;
  view: (flow: Flow) => Html<Change>;
}>;
export type SheetTool =
  | FlowTool
  | Readonly<{
      name: string;
      label: string;
      icon: string;
      sessionView: (s: Session) => Html<Action>[];
    }>;
const button = (
  label: string,
  fn: Change,
  pressed: boolean,
) =>
  el(
    "button",
    [
      attr("type", "button"),
      attr("aria-pressed", String(pressed)),
      attr("title", label),
      attr("aria-label", label),
      attr(
        "data-icon",
        new Map([
          ["straight", "╱"],
          ["step", "⌜"],
          ["curve", "∿"],
          ["正面", "▣"],
          ["立体", "⬡"],
          ["snap off", "⊘"],
        ]).get(label) ??
          label.replace("snap ", "⌗"),
      ),
      onClick(fn),
    ],
    [text(label)],
  );
const tools: readonly FlowTool[] = [
  {
    name: "routes",
    view: (flow) =>
      el(
        "span",
        [],
        (
          [
            "straight",
            "step",
            "curve",
          ] satisfies Array<
            "straight" | "step" | "curve"
          >
        ).map((route) =>
          button(
            route,
            (f) => ({
              ...f,
              edges: f.edges.map((e) => ({
                ...e,
                route,
              })),
            }),
            flow.edges.length > 0 &&
              flow.edges.every(
                (e) =>
                  (e.route ?? "curve") === route,
              ),
          ),
        ),
      ),
  },
  {
    name: "snap",
    view: (flow) =>
      el(
        "span",
        [],
        [0, 8, 16, 32].map((step) =>
          button(
            step ? `snap ${step}` : "snap off",
            (f) => ({ ...f, snap: step }),
            flow.snap === step,
          ),
        ),
      ),
  },
  {
    name: "split",
    view: (flow) =>
      el(
        "button",
        [
          attr("type", "button"),
          attr("title", "接続の途中に挿入"),
          attr("aria-label", "接続の途中に挿入"),
          attr("data-icon", "⊕"),
          ...(!flow.edges.length
            ? [attr("disabled", "")]
            : []),
          onClick(insertOnEdge),
        ],
        [text("接続の途中に挿入")],
      ),
  },
  {
    name: "views",
    view: (f) =>
      f.rooms || f.layered?.options.layerAxis
        ? text("")
        : el(
            "span",
            [],
            (
              [
                ["正面", 0, 0],
                ["立体", -0.48, 0.42],
              ] satisfies [
                string,
                number,
                number,
              ][]
            ).map(([label, yaw, pitch]) =>
              button(
                label,
                viewAt(yaw, pitch),
                f.camera.yaw === yaw &&
                  f.camera.pitch === pitch,
              ),
            ),
          ),
  },
];
const sessionTools = [
  ["reconnect", "接続先を変更", "⇄"],
  ["cycles", "循環の防止", "⟳"],
  ["limit", "出力数の制限", "⊣"],
  ["bypass", "中間ノードを削除", "⇥"],
  ["resize", "サイズ変更", "↔"],
  ["rename", "名前を編集", "✎"],
  ["motion", "アニメーション", "▷"],
  ["labels", "ラベル", "◇"],
  ["collapse", "分岐の折りたたみ", "⊟"],
  ["group", "グループ", "▣"],
  ["layout", "配置", "▦"],
  ["copy", "コピーと貼り付け", "▢"],
  ["history", "履歴", "↶"],
  ["snapshots", "スナップショット", "◉"],
  ["computed", "入力値", "Σ"],
  ["minimap", "ミニマップ", "⊙"],
  ["trace", "配線をたどる", "↝"],
  ["revisions", "編集履歴", "≡"],
  ["outline", "グループ一覧", "☷"],
  ["hidden", "隠線", "◌"],
  ["files", "保存と読み込み", "▤"],
] satisfies [string, string, string][];
export const sheetTools: ReadonlyMap<
  string,
  SheetTool
> = new Map(
  [
    ...tools,
    ...sessionTools.map(
      ([name, label, icon]) => ({
        label,
        icon,
        name,
        sessionView: (s: Session) =>
          sessionControls(name, s),
      }),
    ),
  ].map((tool) => [tool.name, tool]),
);
export const sheetToolNames = (info: string) =>
  info
    .split(/\s+/)
    .flatMap((option) =>
      option.startsWith("tools=")
        ? option
            .slice(6)
            .split(",")
            .filter(Boolean)
        : [],
    );
