export default {
  title: "plgg-flow",
  description:
    "文章で書いて、つかんで動かせる図。",
  base: "/",
  nav: [],
  sidebarStyle: "numbered",
  sidebarGroups: "toggle",
  controls: "head",
  sidebar: [
    {
      text: "ガイド",
      items: [
        {
          text: "DSL の書き方",
          link: "/guide/dsl",
          items: [],
        },
        {
          text: "図の実例",
          link: "/guide/gallery",
          items: [],
        },
        {
          text: "配置と視点",
          link: "/guide/camera",
          items: [],
        },
      ],
    },
    {
      text: "基礎機能",
      items: [
        {
          text: "立体交差",
          link: "/samples/space",
          items: [],
        },
        {
          text: "自動配置",
          link: "/samples/layered",
          items: [],
        },
        {
          text: "レイヤーに分ける",
          link: "/samples/layers",
          items: [],
        },
        {
          text: "部屋に分ける",
          link: "/samples/rooms",
          items: [],
        },
        {
          text: "次元を足す",
          link: "/samples/dimensions",
          items: [],
        },
      ],
    },
    {
      text: "配線",
      items: [
        {
          text: "エッジに挿入",
          link: "/samples/split",
          items: [],
        },
        {
          text: "接続先の変更",
          link: "/samples/reconnect",
          items: [],
        },
        {
          text: "循環の防止",
          link: "/samples/cycles",
          items: [],
        },
        {
          text: "出力数の制限",
          link: "/samples/limit",
          items: [],
        },
        {
          text: "中間ノードの削除",
          link: "/samples/bypass",
          items: [],
        },
        {
          text: "エッジの経路",
          link: "/samples/routes",
          items: [],
        },
        {
          text: "エッジのラベル",
          link: "/samples/labels",
          items: [],
        },
        {
          text: "配線をたどる",
          link: "/samples/trace",
          items: [],
        },
      ],
    },
    {
      text: "ノード",
      items: [
        {
          text: "グリッド吸着",
          link: "/samples/snap",
          items: [],
        },
        {
          text: "ノードのリサイズ",
          link: "/samples/resize",
          items: [],
        },
        {
          text: "ノード内容の編集",
          link: "/samples/rename",
          items: [],
        },
        {
          text: "コピーと貼り付け",
          link: "/samples/copy",
          items: [],
        },
        {
          text: "計算ノード",
          link: "/samples/compute",
          items: [],
        },
      ],
    },
    {
      text: "構造と表示",
      items: [
        {
          text: "分岐の折りたたみ",
          link: "/samples/collapse",
          items: [],
        },
        {
          text: "グループとネスト",
          link: "/samples/group",
          items: [],
        },
        {
          text: "階層レイアウト",
          link: "/samples/layout",
          items: [],
        },
        {
          text: "グループ一覧",
          link: "/samples/outline",
          items: [],
        },
        {
          text: "ミニマップ",
          link: "/samples/overview",
          items: [],
        },
        {
          text: "フローのアニメーション",
          link: "/samples/motion",
          items: [],
        },
      ],
    },
    {
      text: "履歴と保存",
      items: [
        {
          text: "元に戻す・やり直す",
          link: "/samples/history",
          items: [],
        },
        {
          text: "スナップショット",
          link: "/samples/checkpoint",
          items: [],
        },
        {
          text: "編集履歴",
          link: "/samples/revisions",
          items: [],
        },
        {
          text: "保存と読み込み",
          link: "/samples/files",
          items: [],
        },
      ],
    },
    {
      text: "多層アーキテクチャ",
      items: [
        {
          text: "クリーンアーキテクチャ",
          link: "/architectures/clean",
          items: [],
        },
        {
          text: "データ基盤",
          link: "/architectures/data-platform",
          items: [],
        },
        {
          text: "通販サイトの3層",
          link: "/architectures/ec-3tier",
          items: [],
        },
        {
          text: "機械学習システム",
          link: "/architectures/ml-system",
          items: [],
        },
        {
          text: "モバイルアプリ（MVVM）",
          link: "/architectures/mobile-mvvm",
          items: [],
        },
        {
          text: "ネットワークのゾーン",
          link: "/architectures/network-zones",
          items: [],
        },
        {
          text: "サービス × 層 × 環境",
          link: "/architectures/services-3axis",
          items: [],
        },
        {
          text: "サービス × 層 × 環境 × 地域",
          link: "/architectures/services-4axis",
          items: [],
        },
        {
          text: "TCP/IP の4層",
          link: "/architectures/tcpip",
          items: [],
        },
        {
          text: "Web システムの構成",
          link: "/architectures/web-infra",
          items: [],
        },
      ],
    },
    {
      text: "題材",
      items: [
        {
          text: "学ぶ順番",
          link: "/subjects/curriculum",
          items: [],
        },
        {
          text: "同じサービスを環境ごとに",
          link: "/subjects/environments",
          items: [],
        },
        {
          text: "障害対応",
          link: "/subjects/incident",
          items: [],
        },
        {
          text: "データの流れ",
          link: "/subjects/lineage",
          items: [],
        },
        {
          text: "モジュールの依存",
          link: "/subjects/modules",
          items: [],
        },
        {
          text: "ネットワーク",
          link: "/subjects/network",
          items: [],
        },
        {
          text: "組織と案件",
          link: "/subjects/org",
          items: [],
        },
        {
          text: "チームと、リリースの工程",
          link: "/subjects/release",
          items: [],
        },
        {
          text: "供給網",
          link: "/subjects/supply",
          items: [],
        },
        {
          text: "Webサービスの層",
          link: "/subjects/tiers",
          items: [],
        },
      ],
    },
  ],
  social: [],
  dev: { allowedHosts: [] },
};
