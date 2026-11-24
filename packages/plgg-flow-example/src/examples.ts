import {
  fitDemo,
  roomsOpening,
} from "plgg-ir-diagram/flowSheet";
export {
  fitDemo,
  resizeDemo,
  applyDemoSpec,
  roomsOpening,
} from "plgg-ir-diagram/flowSheet";
import { type Flow } from "plgg-flow";
import {
  type Spec,
  parseSpec,
  specFlow,
} from "plgg-flow/dsl";
export type DemoId =
  | "rooms"
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
    initial: () => {
      const flow = specFlow(spec());
      return fitDemo(
        id === "rooms"
          ? roomsOpening(flow)
          : flow,
      );
    },
  };
};
export const examples = [
  demo(
    "space",
    "立体交差",
    "交差している2本の線の間を見てください。⌘（Ctrl）を押しながらドラッグして回すと、手前と奥に分かれます。",
    `node North at -224 -112 160
node South at -224 112 -150
node Upper at 224 -112 -150
node Lower at 224 112 160
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
    "rooms",
    "部屋に分ける",
    "軸の値（「処理」「本番」など）をクリックすると、その部屋が浮かびます。正面・上・横で表に、⌘（Ctrl）＋ドラッグで回せます。",
    `layout rooms
axis x 層 入口 処理 保存
axis y 担当 顧客 注文 基盤
axis z 環境 本番 検証
node Web 層=入口 担当=顧客 環境=本番
node Preview 層=入口 担当=顧客 環境=検証
node Gateway 層=入口 担当=基盤 環境=本番
node Checkout 層=入口 担当=注文 環境=本番
node Auth 層=処理 担当=顧客 環境=本番
node Orders 層=処理 担当=注文 環境=本番
node Payments 層=処理 担当=注文 環境=本番
node Sandbox 層=処理 担当=注文 環境=検証
node Monitor 層=処理 担当=基盤 環境=本番
node Users 層=保存 担当=顧客 環境=本番
node Ledger 層=保存 担当=注文 環境=本番
node Fixtures 層=保存 担当=注文 環境=検証
node Logs 層=保存 担当=基盤 環境=本番
node Trace 層=保存 担当=基盤 環境=検証
Web -> Gateway
Checkout -> Gateway
Gateway -> Auth
Gateway -> Orders
Auth -> Users
Orders -> Payments
Payments -> Ledger
Orders -> Monitor
Monitor -> Logs
Preview -> Sandbox
Sandbox -> Fixtures
Sandbox -> Trace`,
  ),
  demo(
    "split",
    "エッジに挿入",
    "挿入ボタンで先頭の接続を分割し、中間ノードを追加します。",
    `node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
  demo(
    "reconnect",
    "接続先の変更",
    "切替ボタンで Route から伸びる接続を Live と Backup の間で付け替えます。",
    `node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
`,
  ),
  demo(
    "cycles",
    "循環の防止",
    "Result → Source を接続してみてください。循環する接続を拒否し、Source → Result は許可します。",
    `rule acyclic
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
  demo(
    "limit",
    "出力数の制限",
    "Input から Backup へ接続してみてください。既存の出力をダブルクリックで消すと、新しい出力を作れます。",
    `rule max-outputs 1
node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
`,
  ),
  demo(
    "bypass",
    "中間ノードの削除",
    "Process を取り除くと、その入出力を直接つなぎ直します。",
    `node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
  demo(
    "snap",
    "グリッド吸着",
    "ノードをドラッグすると、格子ひとつ分ずつ吸着しながら動きます。snap 8 で半分の間隔に切り替え、snap off で自由に動かせます。",
    `snap 16
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
  demo(
    "resize",
    "ノードのリサイズ",
    "幅スライダーで Process のカードを伸縮します。左右のポートと接続端も追従します。",
    `node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
  demo(
    "rename",
    "ノード内容の編集",
    "名前を入力すると中央のノードに即時反映されます。接続は ID で維持されます。",
    `node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
  demo(
    "routes",
    "エッジの経路",
    "直線、直角、ベジェ曲線を切り替え、ノードを動かして経路の違いを確認できます。",
    `node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
  demo(
    "motion",
    "フローのアニメーション",
    "再生と停止で、接続に沿った流れの向きを確認できます。",
    `node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
  demo(
    "labels",
    "エッジのラベル",
    "条件を入力すると、分岐の接続線に表示されます。",
    `node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
`,
  ),
  demo(
    "collapse",
    "分岐の折りたたみ",
    "Route の下流を折りたたみ、展開すると編集した位置が戻ります。",
    `node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
Route -> Backup
`,
  ),
  demo(
    "group",
    "グループとネスト",
    "Team を動かすと孫まで一緒に移動します。Shift＋クリックで複数選択し、グループ化・収納・親の変更を試せます。",
    `node Team at -256 -112 group
node Design at -40 -48 55 group in Team
node Build at 32 48 -40 in Team
node Review at 120 16 100 in Design
node External at 304 16
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
    `node Input at -160 -80
node Route at 160 -80
node Live at -160 80
node Backup at 152 80
Input -> Route
Route -> Live
`,
  ),
  demo(
    "copy",
    "コピーと貼り付け",
    "ノードを選んでコピーし、貼り付けると位置をずらした独立の複製を作ります。",
    `node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
  demo(
    "history",
    "元に戻す・やり直す",
    "ノードの移動、接続、削除を操作単位で取り消し、やり直せます。",
    `node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
  demo(
    "checkpoint",
    "スナップショット",
    "現在の図と視点を保存し、編集後に復元します。保存先はこのページのメモリです。",
    `node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
  demo(
    "compute",
    "計算ノード",
    "二つの入力を変えると、Sum の値が入力エッジを経由して更新されます。接続を外すと合計も変わります。",
    `node A at -192 -80 value 3
node B at -192 80 value 5
node Sum at 128 16
A -> Sum
B -> Sum
`,
  ),
  demo(
    "overview",
    "ミニマップ",
    "縮小図のノードを押すと、メインビューがそのノードを中心に移動します。",
    `node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
`,
  ),
  demo(
    "trace",
    "配線をたどる",
    "ノードを選ぶと、つながっている相手が入力・出力の一覧に出ます。押すとその相手へ移動し、移動の履歴を戻る・進むで行き来できます。",
    `node Order at -256 16
node Stock at -32 -80
node Payment at -40 80
node Ship at 192 16
node Notify at 376 16
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
    `node Draft at -224 16
node Review at 24 16
node Publish at 216 16
Draft -> Review
Review -> Publish
`,
  ),
  demo(
    "outline",
    "グループ一覧",
    "入れ子になったグループを一覧でたどれます。グループを開くと中身が並び、選ぶと図の上でそのノードへ移動します。",
    `node Company at -296 -112 group
node Sales at -160 -48 group in Company
node Dev at 64 -48 group in Company
node Alice at -192 48 in Sales
node Bob at -96 48 in Sales
node Carol at 32 48 in Dev
node Dave at 128 48 in Dev
Alice -> Carol
Bob -> Dave
`,
  ),
  demo(
    "files",
    "保存と読み込み",
    "図をファイルに書き出して読み込み直したり、ブラウザの中に保存して後から再開したりできます。",
    `node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
`,
  ),
];
