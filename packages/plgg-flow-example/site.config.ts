import { joinedTo } from "../../sites.ts";

const english = process.env.SITE_LOCALE === "en";
const label = (ja: string, en: string) =>
  english ? en : ja;
const item = (
  link: string,
  ja: string,
  en: string,
) => ({ text: label(ja, en), link, items: [] });
export default {
  title: label(
    "plgg-flow ガイド",
    "plgg-flow guide",
  ),
  description: label(
    "ノードと接続を文章で書き、図を動かして確かめます。",
    "Write diagrams in text and explore their connections and data.",
  ),
  base: english ? "/en/" : "/",
  nav: [],
  sidebarStyle: "tree",
  sidebarGroups: "toggle",
  controls: "sidebar",
  contentWidth: "fill",
  sidebar: [
    {
      text: label("はじめに", "Getting started"),
      items: [
        item(
          "/",
          "このガイドについて",
          "About this guide",
        ),
        item(
          "/guide/gallery",
          "図の実例",
          "Read three diagrams",
        ),
        item(
          "/guide/camera",
          "配置と視点",
          "Position and camera",
        ),
        item(
          "/guide/dsl",
          "DSL の構文",
          "DSL syntax",
        ),
      ],
    },
    {
      text: label(
        "グラフを描く",
        "Chart layouts",
      ),
      items: [
        item(
          "/guide/charts",
          "グラフの選び方と構文",
          "Chart layouts",
        ),
        item(
          "/plots/options",
          "案を比べる",
          "Compare alternatives",
        ),
        item(
          "/plots/conditions",
          "条件の中で選ぶ",
          "Set limits and size markers",
        ),
        item(
          "/plots/quadrant",
          "効果と手間で分ける",
          "Compare impact and effort",
        ),
        item(
          "/plots/bars",
          "量を 2 つの種類で比べる",
          "Compare quantities with bars",
        ),
        item(
          "/plots/area",
          "推移を系列ごとに奥へ並べる",
          "Follow a series in depth",
        ),
        item(
          "/plots/line",
          "推移を線で読み比べる",
          "Compare trends with lines",
        ),
        item(
          "/plots/stack",
          "合計と内訳を積んで見る",
          "Read totals and contributions",
        ),
        item(
          "/plots/radar",
          "いくつもの条件で形を比べる",
          "Compare profiles on a radar chart",
        ),
        item(
          "/plots/pie",
          "全体の中の割合を見る",
          "Compare shares of a whole",
        ),
        item(
          "/plots/tree",
          "全体が何でできているか",
          "Break a whole into parts",
        ),
        item(
          "/plots/sankey",
          "量がどこへ流れるか",
          "Follow a quantity through a network",
        ),
        item(
          "/plots/sequence",
          "やりとりの順",
          "Read a message sequence",
        ),
        item(
          "/plots/timeline",
          "いつ何が走るか",
          "Place tasks on a timeline",
        ),
      ],
    },
    {
      text: label(
        "ノードを配置する",
        "Arrange nodes",
      ),
      items: [
        item(
          "/samples/space",
          "立体交差",
          "Depth at a crossing",
        ),
        item(
          "/samples/layered",
          "自動配置",
          "Automatic layout",
        ),
        item(
          "/samples/layers",
          "レイヤーに分ける",
          "One board per layer",
        ),
        item(
          "/samples/rooms",
          "部屋に分ける",
          "Rooms by category",
        ),
        item(
          "/samples/dimensions",
          "次元を足す",
          "Compare regions",
        ),
      ],
    },
    {
      text: label(
        "接続と編集",
        "Connect and edit",
      ),
      items: [
        item(
          "/samples/split",
          "エッジに挿入",
          "Insert a node on an edge",
        ),
        item(
          "/samples/reconnect",
          "接続先の変更",
          "Change a destination",
        ),
        item(
          "/samples/cycles",
          "循環の防止",
          "Prevent cycles",
        ),
        item(
          "/samples/limit",
          "出力数の制限",
          "Limit outgoing edges",
        ),
        item(
          "/samples/bypass",
          "中間ノードの削除",
          "Bypass a node",
        ),
        item(
          "/samples/routes",
          "エッジの経路",
          "Choose an edge route",
        ),
        item(
          "/samples/labels",
          "エッジのラベル",
          "Label an edge",
        ),
        item(
          "/samples/trace",
          "配線をたどる",
          "Follow connections",
        ),
        item(
          "/samples/snap",
          "グリッド吸着",
          "Snap to a grid",
        ),
        item(
          "/samples/resize",
          "ノードのリサイズ",
          "Resize a card",
        ),
        item(
          "/samples/rename",
          "ノード内容の編集",
          "Edit a label",
        ),
        item(
          "/samples/copy",
          "コピーと貼り付け",
          "Copy a node",
        ),
        item(
          "/samples/compute",
          "計算ノード",
          "Sum two inputs",
        ),
        item(
          "/samples/collapse",
          "分岐の折りたたみ",
          "Fold a branch",
        ),
        item(
          "/samples/group",
          "グループとネスト",
          "Nest groups",
        ),
        item(
          "/samples/layout",
          "階層レイアウト",
          "Rearrange a graph",
        ),
        item(
          "/samples/outline",
          "グループ一覧",
          "Browse a group outline",
        ),
        item(
          "/samples/overview",
          "ミニマップ",
          "Navigate with the minimap",
        ),
        item(
          "/samples/motion",
          "フローのアニメーション",
          "Animate the flow",
        ),
      ],
    },
    {
      text: label(
        "履歴と保存",
        "History and storage",
      ),
      items: [
        item(
          "/samples/history",
          "元に戻す・やり直す",
          "Undo and redo",
        ),
        item(
          "/samples/checkpoint",
          "スナップショット",
          "Restore a snapshot",
        ),
        item(
          "/samples/revisions",
          "編集履歴",
          "Inspect a node’s history",
        ),
        item(
          "/samples/files",
          "保存と読み込み",
          "Save and load",
        ),
      ],
    },
    {
      text: label(
        "システム構成の図",
        "Architecture diagrams",
      ),
      items: [
        item(
          "/architectures/clean",
          "クリーンアーキテクチャ",
          "Clean architecture",
        ),
        item(
          "/architectures/data-platform",
          "データ基盤",
          "A data platform",
        ),
        item(
          "/architectures/ec-3tier",
          "通販サイトの3層",
          "Three tiers of a storefront",
        ),
        item(
          "/architectures/ml-system",
          "機械学習システム",
          "A machine learning system",
        ),
        item(
          "/architectures/mobile-mvvm",
          "モバイルアプリ（MVVM）",
          "A mobile app using MVVM",
        ),
        item(
          "/architectures/network-zones",
          "ネットワークのゾーン",
          "Network zones",
        ),
        item(
          "/architectures/services-3axis",
          "サービス × 層 × 環境",
          "Services by layer and environment",
        ),
        item(
          "/architectures/services-4axis",
          "サービス × 層 × 環境 × 地域",
          "Compare deployments across regions",
        ),
        item(
          "/architectures/tcpip",
          "TCP/IP の4層",
          "The four TCP/IP layers",
        ),
        item(
          "/architectures/web-infra",
          "Web システムの構成",
          "Web infrastructure",
        ),
      ],
    },
    {
      text: label(
        "題材別の図",
        "Worked examples",
      ),
      items: [
        item(
          "/subjects/curriculum",
          "学ぶ順番",
          "Course prerequisites",
        ),
        item(
          "/subjects/environments",
          "同じサービスを環境ごとに",
          "Compare service environments",
        ),
        item(
          "/subjects/incident",
          "障害対応",
          "Incident response",
        ),
        item(
          "/subjects/lineage",
          "データの流れ",
          "Trace data lineage",
        ),
        item(
          "/subjects/modules",
          "モジュールの依存",
          "Module dependencies",
        ),
        item(
          "/subjects/network",
          "ネットワーク",
          "Network paths",
        ),
        item(
          "/subjects/org",
          "組織と案件",
          "People and projects",
        ),
        item(
          "/subjects/release",
          "チームと、リリースの工程",
          "Teams and release stages",
        ),
        item(
          "/subjects/supply",
          "供給網",
          "A supply network",
        ),
        item(
          "/subjects/tiers",
          "Webサービスの層",
          "Layers of a web service",
        ),
      ],
    },
    {
      text: label("言語", "Language"),
      items: [
        item(
          english ? "/../" : "/en/",
          "English",
          "日本語",
        ),
      ],
    },
  ],
  social: [],
  dev: { allowedHosts: [] },
  ...joinedTo("https://plgg-flow.qmu.co.jp"),
};
