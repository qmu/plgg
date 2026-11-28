import { joinedTo } from "../../sites.ts";
import {
  defineSite,
  type SiteConfigInput,
} from "plggpress";

const english = process.env.SITE_LOCALE === "en";
const label = (ja: string, en: string) =>
  english ? en : ja;
const item = (
  link: string,
  ja: string,
  en: string,
) => ({ link, text: label(ja, en), items: [] });
const library = (name: string) =>
  item("/packages/" + name + "/", name, name);

const config = {
  title: label("plgg ガイド", "The plgg guide"),
  description: label(
    "TypeScript の入力を検証し、plgg のライブラリを組み合わせてアプリケーションを作ります。",
    "Validate input and compose TypeScript applications with the plgg libraries.",
  ),
  base: english ? "/en/" : "/",
  nav: [],
  sidebarStyle: "tree",
  sidebarGroups: "toggle",
  controls: "sidebar",
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
          "/getting-started/",
          "最初のプログラム",
          "Your first program",
        ),
        item(
          "/tutorial/",
          "本棚を作る",
          "Build a bookshelf",
        ),
        item(
          "/recipes/",
          "実装レシピ",
          "Recipes",
        ),
        item(
          "/packages/",
          "用途から選ぶ",
          "Find a package",
        ),
        item(
          "/contributing/conventions/",
          "変更と検証",
          "Contribute and verify",
        ),
      ],
    },
    {
      text: label(
        "基本の考え方",
        "Core concepts",
      ),
      items: [
        item(
          "/concepts/",
          "処理の流れ",
          "From input to output",
        ),
        item(
          "/concepts/tagged-data/",
          "タグ付きの値",
          "Tagged values",
        ),
        item(
          "/concepts/option/",
          "省略できる値",
          "Optional values",
        ),
        item(
          "/concepts/result/",
          "成功と失敗",
          "Success and failure",
        ),
        item(
          "/concepts/validation/",
          "入力の検証",
          "Validating input",
        ),
        item(
          "/concepts/composition/",
          "関数の合成",
          "Composing functions",
        ),
        item(
          "/concepts/async/",
          "非同期処理",
          "Asynchronous steps",
        ),
        item(
          "/concepts/collections/",
          "レコードと辞書",
          "Records and dictionaries",
        ),
        item(
          "/concepts/instances/",
          "インスタンス",
          "Instances",
        ),
        item(
          "/concepts/narrowing/",
          "型の絞り込み",
          "Narrowing",
        ),
        item(
          "/concepts/match/",
          "場合分け",
          "Pattern matching",
        ),
      ],
    },
    {
      text: label(
        "設計と判断",
        "Design decisions",
      ),
      items: [
        item(
          "/design/choices/",
          "設計の理由",
          "Design choices",
        ),
        item(
          "/design/alternatives/",
          "ほかの選択肢",
          "Choosing an approach",
        ),
        item(
          "/design/friction/",
          "型と境界でつまずいたら",
          "Working through friction",
        ),
        item(
          "/design/family/",
          "パッケージの境界",
          "Package boundaries",
        ),
      ],
    },
    {
      text: label("plgg 本体", "Core library"),
      items: [
        item(
          "/packages/plgg/",
          "本体の役割",
          "Role of the core",
        ),
        item(
          "/packages/plgg/values-effects/",
          "値と変換",
          "Values and transformations",
        ),
        item(
          "/packages/plgg/structures-errors/",
          "構造とエラー",
          "Structures and errors",
        ),
      ],
    },
    {
      text: label(
        "画面と HTTP",
        "Views and HTTP",
      ),
      items: [
        "plgg-http",
        "plgg-server",
        "plgg-fetch",
        "plgg-router",
        "plgg-view",
        "example",
      ].map(library),
    },
    {
      text: label(
        "データと認証",
        "Storage and authentication",
      ),
      items: [
        "plgg-sql",
        "plgg-db-migration",
        "plgg-auth",
        "plgg-cms",
      ].map(library),
    },
    {
      text: label(
        "言語と文書",
        "Languages and documents",
      ),
      items: [
        "plgg-parser",
        "plgg-md",
        "plgg-highlight",
        "plgg-ir-syntax",
        "plgg-ir-language",
        "plgg-ir-manifest",
        "plgg-ir-thesis",
        "plgg-ir-thesis-proof",
        "plgg-ir-diagram",
      ].map(library),
    },
    {
      text: label(
        "モデルとツール",
        "Models and tools",
      ),
      items: [
        "plgg-kit",
        "plgg-token-metering",
        "plgg-foundry",
        "plgg-mcp",
        "plgg-cli",
        "plgg-bundle",
        "plgg-test",
      ].map(library),
    },
    {
      text: label(
        "描画と関連サイト",
        "Graphics and related sites",
      ),
      items: [
        "plgg-board",
        "plgg-flow",
        "plggmatic",
        "plggpress",
        "guide",
        "plgg-flow-example",
        "plggmatic-example",
      ].map(library),
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
  social: [
    {
      icon: "github",
      link: "https://github.com/qmu/plgg",
    },
  ],
  dev: {
    allowedHosts: [
      "localhost",
      "plgg-guide.qmu.dev",
    ],
  },
  ...joinedTo("https://plgg.qmu.co.jp"),
} satisfies SiteConfigInput;

export const site = defineSite(config);
export default config;
