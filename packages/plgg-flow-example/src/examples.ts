import type { Flow } from "plgg-flow";
import {
  parseSpec,
  specFlow,
  type Spec,
} from "plgg-flow/dsl";

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
  /** The diagram, written in the flow DSL. */
  source: string;
  spec: () => Spec;
  initial: () => Flow;
}>;
const empty: Spec = {
  graph: { nodes: [], edges: [] },
  rules: [],
};
const demo = (
  id: DemoId,
  name: string,
  hint: string,
  source: string,
): Demo => {
  const spec = () => {
    const r = parseSpec(source);
    return r.__tag === "Ok" ? r.content : empty;
  };
  return {
    id,
    name,
    hint,
    source,
    spec,
    initial: () => specFlow(spec()),
  };
};
export const examples = [
  demo(
    "space",
    "立体交差",
    "交差している2本の線の間を見てください。視点をゆっくり回すと、手前と奥に分かれます。",
    `node North at -225 -100 160
node South at -225 100 -150
node Upper at 220 -95 -150
node Lower at 220 100 160
North -> Lower
South -> Upper
North -> Upper
South -> Lower
`,
  ),
  demo(
    "split",
    "エッジに挿入",
    "挿入ボタンで先頭の接続を分割し、中間ノードを追加します。",
    `node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
  demo(
    "reconnect",
    "接続先の変更",
    "切替ボタンで Route から伸びる接続を Live と Backup の間で付け替えます。",
    `node Input at -220 0
node Route at 0 0
node Live at 220 -85
node Backup at 220 85
Input -> Route
Route -> Live
`,
  ),
  demo(
    "cycles",
    "循環の防止",
    "Result → Source を接続してみてください。循環する接続を拒否し、Source → Result は許可します。",
    `rule acyclic
node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
  demo(
    "limit",
    "出力数の制限",
    "Input から Backup へ接続してみてください。既存の出力をダブルクリックで消すと、新しい出力を作れます。",
    `rule max-outputs 1
node Input at -220 0
node Route at 0 0
node Live at 220 -85
node Backup at 220 85
Input -> Route
Route -> Live
`,
  ),
  demo(
    "bypass",
    "中間ノードの削除",
    "Process を取り除くと、その入出力を直接つなぎ直します。",
    `node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
  demo(
    "snap",
    "グリッド吸着",
    "ノードをドラッグして離すと格子に吸着します。吸着間隔を切り替えて比較できます。",
    `snap 32
node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
  demo(
    "resize",
    "ノードのリサイズ",
    "幅スライダーで Process のカードを伸縮します。左右のポートと接続端も追従します。",
    `node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
  demo(
    "rename",
    "ノード内容の編集",
    "名前を入力すると中央のノードに即時反映されます。接続は ID で維持されます。",
    `node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
  demo(
    "routes",
    "エッジの経路",
    "直線、直角、ベジェ曲線を切り替え、ノードを動かして経路の違いを確認できます。",
    `node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
  demo(
    "motion",
    "フローのアニメーション",
    "再生と停止で、接続に沿った流れの向きを確認できます。",
    `node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
  demo(
    "labels",
    "エッジのラベル",
    "条件を入力すると、分岐の接続線に表示されます。",
    `node Input at -220 0
node Route at 0 0
node Live at 220 -85
node Backup at 220 85
Input -> Route
Route -> Live
`,
  ),
  demo(
    "collapse",
    "分岐の折りたたみ",
    "Route の下流を折りたたみ、展開すると編集した位置が戻ります。",
    `node Input at -220 0
node Route at 0 0
node Live at 220 -85
node Backup at 220 85
Input -> Route
Route -> Live
Route -> Backup
`,
  ),
  demo(
    "group",
    "グループとネスト",
    "Team を動かすと孫まで一緒に移動します。Shift＋クリックで複数選択し、グループ化・収納・親の変更を試せます。",
    `node Team at -250 -100 group
node Design at -40 -50 55 group in Team
node Build at 40 40 -40 in Team
node Review at 105 10 100 in Design
node External at 290 0
Team -> Design
Team -> Build
Build -> External
Review -> External
`,
  ),
  demo(
    "layout",
    "階層レイアウト",
    "ノードを自由に動かした後、接続の深さから列と行を計算して再配置します。",
    `node Input at -145 -90
node Route at 145 -90
node Live at -145 90
node Backup at 145 90
Input -> Route
Route -> Live
`,
  ),
  demo(
    "copy",
    "コピーと貼り付け",
    "ノードを選んでコピーし、貼り付けると位置をずらした独立の複製を作ります。",
    `node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
  demo(
    "history",
    "元に戻す・やり直す",
    "ノードの移動、接続、削除を操作単位で取り消し、やり直せます。",
    `node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
  demo(
    "checkpoint",
    "スナップショット",
    "現在の図と視点を保存し、編集後に復元します。保存先はこのページのメモリです。",
    `node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
  demo(
    "compute",
    "計算ノード",
    "二つの入力を変えると、Sum の値が入力エッジを経由して更新されます。接続を外すと合計も変わります。",
    `node A at -180 -75 value 3
node B at -180 75 value 5
node Sum at 140 0
A -> Sum
B -> Sum
`,
  ),
  demo(
    "overview",
    "ミニマップ",
    "縮小図のノードを押すと、メインビューがそのノードを中心に移動します。",
    `node Input at -220 0
node Route at 0 0
node Live at 220 -85
node Backup at 220 85
Input -> Route
Route -> Live
`,
  ),
];
