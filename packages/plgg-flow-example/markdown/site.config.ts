export default {
  title: "plgg-flow",
  description:
    "文章で書いて、つかんで動かせる図。",
  base: "/markdown/",
  nav: [],
  sidebarStyle: "numbered",
  tagline: "plgg-view のための空間ダイアグラム。",
  footerLink: {
    text: "デモに戻る",
    link: "/../",
  },
  sidebar: [
    {
      text: "実例",
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
          text: "部屋に分ける",
          link: "/samples/rooms",
          items: [],
        },
      ],
    },
    {
      text: "ガイド",
      items: [
        {
          text: "はじめに",
          link: "/",
          items: [],
        },
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
  ],
  social: [],
  dev: { allowedHosts: [] },
};
