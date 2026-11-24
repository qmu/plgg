import { project } from "plgg-board";
import {
  nodeSize,
  bodyDepth,
  bridgePoints,
  frameOf,
  viewport,
  type Flow,
} from "plgg-flow";
import { wireGraph } from "plgg-flow/wiring";
import {
  parseSpec,
  specFlow,
  applySpec,
  type Spec,
} from "plgg-flow/dsl";

export type DemoId =
  | "layered"
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
  | "overview"
  | "trace"
  | "revisions"
  | "outline"
  | "files";
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
// Initial and reset sessions both open on the front of the board.
export const fitDemo = (flow: Flow): Flow => {
  if (!flow.nodes.length) return flow;
  const at = project({
    ...flow.camera,
    origin: { x: 0, y: 0 },
    scale: 1,
  });
  const bounds = [
    ...flow.nodes.flatMap((n) => {
      const { width, height } = nodeSize(n);
      return [-1, 1].flatMap((x) =>
        [-1, 1].flatMap((y) =>
          [-1, 1].map((z) =>
            at({
              x: n.position.x + (x * width) / 2,
              y: n.position.y + (y * height) / 2,
              z: n.position.z + z * bodyDepth(n),
            }),
          ),
        ),
      );
    }),
    ...wireGraph(flow).flatMap((w) =>
      bridgePoints(
        w.points,
        w.lift,
        flow.camera.pitch === 0 &&
          flow.camera.yaw === 0,
      ).map(at),
    ),
  ].reduce(
    (box, p) => ({
      left: Math.min(box.left, p.x),
      right: Math.max(box.right, p.x),
      top: Math.min(box.top, p.y),
      bottom: Math.max(box.bottom, p.y),
    }),
    {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity,
    },
  );
  const frame = frameOf(flow),
    open = frame.x - (flow.cover ?? 0);
  const scale = Math.min(
    1,
    Math.max(1, open - 96) /
      (bounds.right - bounds.left),
    Math.max(1, frame.y - 96) /
      (bounds.bottom - bounds.top),
  );
  return {
    ...flow,
    camera: {
      ...flow.camera,
      scale,
      origin: {
        x:
          (open -
            scale *
              (bounds.left + bounds.right)) /
          2,
        y:
          (frame.y -
            scale *
              (bounds.top + bounds.bottom)) /
          2,
      },
    },
  };
};
export const resizeDemo = (
  flow: Flow,
  height: number,
  fitted: boolean,
  cover = 0,
): Flow => {
  const previous = frameOf(flow);
  if (
    flow.frame &&
    previous.y === height &&
    previous.x === viewport.x &&
    (flow.cover ?? 0) === cover
  )
    return flow;
  const frame = { x: viewport.x, y: height };
  const next = { ...flow, frame, cover };
  if (fitted) return fitDemo(next);
  return {
    ...next,
    camera: {
      ...flow.camera,
      origin: {
        x:
          flow.camera.origin.x +
          (frame.x - previous.x) / 2,
        y:
          flow.camera.origin.y +
          (frame.y - previous.y) / 2,
      },
    },
  };
};
const layoutKey = (flow: Flow) =>
  JSON.stringify([
    flow.nodes.map((n) => [
      n.id,
      n.position,
      nodeSize(n),
    ]),
    flow.edges.map((e) => [
      e.source,
      e.target,
      e.route,
      e.via,
      e.lift,
    ]),
  ]);
export const applyDemoSpec =
  (spec: Spec) => (flow: Flow) => {
    const next = applySpec(spec)(flow);
    return layoutKey(next) === layoutKey(flow)
      ? next
      : fitDemo(next);
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
    initial: () => fitDemo(specFlow(spec())),
  };
};
export const examples = [
  demo(
    "space",
    "立体交差",
    "交差している2本の線の間を見てください。⌘（Ctrl）を押しながらドラッグして回すと、手前と奥に分かれます。",
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
    "layered",
    "自動配置",
    "接続だけを書いた図です。上から下へ自動で並びます。⌘（Ctrl）を押しながらドラッグして回すと、層が階段状に見えます。",
    `layout layered down depth
Web -> Gateway
Mobile -> Gateway
Gateway -> Auth
Gateway -> Orders
Gateway -> Catalog
Gateway -> Search
Auth -> Users
Users -> DB
Orders -> Payments
Orders -> Queue
Payments -> Ledger
Queue -> Mailer
Ledger -> Audit
Mailer -> Audit
Catalog -> Cache
Search -> Cache
Cache -> DB
Audit -> Gateway
DB -> Catalog
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
    "ノードをドラッグすると、格子ひとつ分ずつ吸着しながら動きます。吸着間隔を切り替えて比較できます。",
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
  demo(
    "trace",
    "配線をたどる",
    "ノードを選ぶと、つながっている相手が入力・出力の一覧に出ます。押すとその相手へ移動し、移動の履歴を戻る・進むで行き来できます。",
    `node Order at -260 0
node Stock at -40 -90
node Payment at -40 90
node Ship at 200 0
node Notify at 380 0
Order -> Stock "在庫確認"
Order -> Payment "決済"
Stock -> Ship
Payment -> Ship
Ship -> Notify
`,
  ),
  demo(
    "revisions",
    "編集履歴",
    "ノードを選んで「履歴を追う」を押し、動かしたり名前を変えたりすると、そのノードに起きた変更が順に並びます。",
    `node Draft at -220 0
node Review at 0 0
node Publish at 220 0
Draft -> Review
Review -> Publish
`,
  ),
  demo(
    "outline",
    "グループ一覧",
    "入れ子になったグループを一覧でたどれます。グループを開くと中身が並び、選ぶと図の上でそのノードへ移動します。",
    `node Company at -300 -120 group
node Sales at -150 -40 group in Company
node Dev at 60 -40 group in Company
node Alice at -180 40 in Sales
node Bob at -90 40 in Sales
node Carol at 40 40 in Dev
node Dave at 140 40 in Dev
Alice -> Carol
Bob -> Dave
`,
  ),
  demo(
    "files",
    "保存と読み込み",
    "図をファイルに書き出して読み込み直したり、ブラウザの中に保存して後から再開したりできます。",
    `node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
`,
  ),
];
