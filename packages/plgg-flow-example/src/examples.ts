import {
  acyclicConnection,
  limitOutputs,
  createFlow,
  type Flow,
  type Graph,
  type FlowNode,
} from "plgg-flow";

export type DemoId =
  | "space"
  | "split"
  | "reconnect"
  | "cycles"
  | "limit"
  | "bypass"
  | "snap"
  | "resize"
  | "rename"
  | "routes"
  | "motion"
  | "labels"
  | "collapse"
  | "group"
  | "layout"
  | "copy"
  | "history"
  | "checkpoint"
  | "compute"
  | "overview";
type Demo = Readonly<{
  id: DemoId;
  name: string;
  hint: string;
  initial: () => Flow;
}>;
const node = (
  id: string,
  x: number,
  y: number,
  z = 0,
): FlowNode => ({
  id,
  label: id,
  position: { x, y, z },
});
const graph = (
  nodes: readonly FlowNode[],
  links: readonly (readonly [string, string])[],
): Graph => ({
  nodes,
  edges: links.map(([source, target]) => ({
    source,
    target,
  })),
});
const chain = () =>
  createFlow(
    graph(
      [
        node("Source", -220, -50),
        node("Process", 0, 15),
        node("Result", 220, -50),
      ],
      [
        ["Source", "Process"],
        ["Process", "Result"],
      ],
    ),
  );
const fork = () =>
  createFlow(
    graph(
      [
        node("Input", -220, 0),
        node("Route", 0, 0),
        node("Live", 220, -85),
        node("Backup", 220, 85),
      ],
      [
        ["Input", "Route"],
        ["Route", "Live"],
      ],
    ),
  );
const demo = (
  id: DemoId,
  name: string,
  hint: string,
  initial: () => Flow = chain,
): Demo => ({ id, name, hint, initial });
export const examples = [
  demo(
    "space",
    "立体交差",
    "交差している2本の線の間を見てください。視点をゆっくり回すと、手前と奥に分かれます。",
    () =>
      createFlow(
        graph(
          [
            node("North", -225, -100, 160),
            node("South", -225, 100, -150),
            node("Upper", 220, -95, -150),
            node("Lower", 220, 100, 160),
          ],
          [
            ["North", "Lower"],
            ["South", "Upper"],
            ["North", "Upper"],
            ["South", "Lower"],
          ],
        ),
      ),
  ),
  demo(
    "split",
    "エッジに挿入",
    "挿入ボタンで先頭の接続を分割し、中間ノードを追加します。",
  ),
  demo(
    "reconnect",
    "接続先の変更",
    "切替ボタンで Route から伸びる接続を Live と Backup の間で付け替えます。",
    fork,
  ),
  demo(
    "cycles",
    "循環の防止",
    "Result → Source を接続してみてください。循環する接続を拒否し、Source → Result は許可します。",
    () => ({
      ...chain(),
      allowConnection: acyclicConnection,
    }),
  ),
  demo(
    "limit",
    "出力数の制限",
    "Input から Backup へ接続してみてください。既存の出力をダブルクリックで消すと、新しい出力を作れます。",
    () => ({
      ...fork(),
      allowConnection: limitOutputs(1),
    }),
  ),
  demo(
    "bypass",
    "中間ノードの削除",
    "Process を取り除くと、その入出力を直接つなぎ直します。",
  ),
  demo(
    "snap",
    "グリッド吸着",
    "ノードをドラッグして離すと格子に吸着します。吸着間隔を切り替えて比較できます。",
    () => ({ ...chain(), snap: 32 }),
  ),
  demo(
    "resize",
    "ノードのリサイズ",
    "幅スライダーで Process のカードを伸縮します。左右のポートと接続端も追従します。",
  ),
  demo(
    "rename",
    "ノード内容の編集",
    "名前を入力すると中央のノードに即時反映されます。接続は ID で維持されます。",
  ),
  demo(
    "routes",
    "エッジの経路",
    "直線、直角、ベジェ曲線を切り替え、ノードを動かして経路の違いを確認できます。",
  ),
  demo(
    "motion",
    "フローのアニメーション",
    "再生と停止で、接続に沿った流れの向きを確認できます。",
  ),
  demo(
    "labels",
    "エッジのラベル",
    "条件を入力すると、分岐の接続線に表示されます。",
    fork,
  ),
  demo(
    "collapse",
    "分岐の折りたたみ",
    "Route の下流を折りたたみ、展開すると編集した位置が戻ります。",
    () => {
      const f = fork();
      return {
        ...f,
        edges: [
          ...f.edges,
          { source: "Route", target: "Backup" },
        ],
      };
    },
  ),
  demo(
    "group",
    "グループとネスト",
    "Team を動かすと孫まで一緒に移動します。Shift＋クリックで複数選択し、グループ化・収納・親の変更を試せます。",
    () =>
      createFlow(
        graph(
          [
            {
              ...node("Team", -250, -100),
              group: true,
            },
            {
              ...node("Design", -40, -50, 55),
              group: true,
              parent: "Team",
            },
            {
              ...node("Build", 40, 40, -40),
              parent: "Team",
            },
            {
              ...node("Review", 105, 10, 100),
              parent: "Design",
            },
            node("External", 290, 0),
          ],
          [
            ["Team", "Design"],
            ["Team", "Build"],
            ["Build", "External"],
            ["Review", "External"],
          ],
        ),
      ),
  ),
  demo(
    "layout",
    "階層レイアウト",
    "ノードを自由に動かした後、接続の深さから列と行を計算して再配置します。",
    () => {
      const f = fork();
      return {
        ...f,
        nodes: f.nodes.map((n, i) => ({
          ...n,
          position: {
            x: (i % 2) * 290 - 145,
            y: Math.floor(i / 2) * 180 - 90,
            z: 0,
          },
        })),
      };
    },
  ),
  demo(
    "copy",
    "コピーと貼り付け",
    "ノードを選んでコピーし、貼り付けると位置をずらした独立の複製を作ります。",
  ),
  demo(
    "history",
    "元に戻す・やり直す",
    "ノードの移動、接続、削除を操作単位で取り消し、やり直せます。",
  ),
  demo(
    "checkpoint",
    "スナップショット",
    "現在の図と視点を保存し、編集後に復元します。保存先はこのページのメモリです。",
  ),
  demo(
    "compute",
    "計算ノード",
    "二つの入力を変えると、Sum の値が入力エッジを経由して更新されます。接続を外すと合計も変わります。",
    () =>
      createFlow(
        graph(
          [
            { ...node("A", -180, -75), value: 3 },
            { ...node("B", -180, 75), value: 5 },
            node("Sum", 140, 0),
          ],
          [
            ["A", "Sum"],
            ["B", "Sum"],
          ],
        ),
      ),
  ),
  demo(
    "overview",
    "ミニマップ",
    "縮小図のノードを押すと、メインビューがそのノードを中心に移動します。",
    fork,
  ),
];
