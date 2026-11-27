import { joinedTo } from "../../../sites.ts";
import type { SiteConfigInput } from "plggpress";

const english = process.env.SITE_LOCALE === "en";
const label = (ja: string, en: string) =>
  english ? en : ja;
const item = (
  link: string,
  ja: string,
  en: string,
) => ({
  link,
  text: label(ja, en),
  items: [],
});
export default {
  title: label(
    "plggpress ガイド",
    "plggpress guide",
  ),
  description: label(
    "Markdown でページを書き、関連する資料を隣の列で読めるサイトを作ります。",
    "Build a Markdown site where readers can open related pages side by side.",
  ),
  base: english ? "/en/" : "/",
  nav: [],
  sidebarStyle: "tree",
  sidebarGroups: "open",
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
          "/start/",
          "最初のサイト",
          "Your first site",
        ),
        item(
          "/columns/",
          "列で読む",
          "Reading in columns",
        ),
      ],
    },
    {
      text: label(
        "ページを書く",
        "Writing pages",
      ),
      items: [
        item(
          "/markdown/",
          "Markdown とリンク",
          "Markdown and links",
        ),
        item(
          "/sheets/",
          "図を載せる",
          "Embedding diagrams",
        ),
        item(
          "/parts/",
          "部品を登録する",
          "Registering a part",
        ),
      ],
    },
    {
      text: label(
        "サイトを組む",
        "Building a site",
      ),
      items: [
        item(
          "/layout/",
          "目次と外観",
          "Navigation and appearance",
        ),
        item(
          "/joining/",
          "サイトをつなぐ",
          "Joining sites",
        ),
        item(
          "/checks/",
          "リンクとモデルの検証",
          "Checking links and models",
        ),
        item(
          "/operations/",
          "ビルドと公開",
          "Building and publishing",
        ),
      ],
    },
    {
      text: label("リファレンス", "Reference"),
      items: [
        item("/cli/", "CLI", "CLI"),
        item(
          "/config/",
          "設定項目",
          "Configuration",
        ),
      ],
    },
    {
      text: label("言語", "Language"),
      items: [
        // Sidebar paths are prefixed with the current base.
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
  ...joinedTo("https://plggpress.qmu.co.jp"),
} satisfies SiteConfigInput;
