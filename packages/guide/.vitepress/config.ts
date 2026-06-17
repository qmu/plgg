import { defineConfig } from "vitepress";

// Information architecture for the plgg family guide.
//
// This file is the *contract* every later content
// ticket (T2–T8) fills in: the nav and sidebar tree
// below name every page, and each section is owned by
// one ticket. Keep the tree comprehensive — one node
// per package + concept — so no later ticket has to
// restructure navigation.
export default defineConfig({
  title: "plgg",
  description:
    "The official guide for plgg and the " +
    "plgg family — a TypeScript toolkit where " +
    "web development is one typed pipeline: " +
    "Option/Result, errors as data, " +
    "runtime-neutral, built from scratch.",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/getting-started" },
      {
        text: "Packages",
        link: "/packages/plgg/",
      },
      { text: "API", link: "/api/" },
      {
        text: "GitHub",
        link: "https://github.com/qmu/plgg",
      },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          {
            text: "Getting started",
            link: "/getting-started",
          },
          {
            text: "Core concepts",
            link: "/concepts/",
          },
        ],
      },
      {
        text: "Packages",
        items: [
          {
            text: "plgg (core)",
            link: "/packages/plgg/",
            items: [
              {
                text: "Values & effects",
                link: "/packages/plgg/values-effects",
              },
              {
                text: "Structures & errors",
                link: "/packages/plgg/structures-errors",
              },
            ],
          },
          {
            text: "plgg-http",
            link: "/packages/plgg-http",
          },
          {
            text: "plgg-server",
            link: "/packages/plgg-server",
          },
          {
            text: "plgg-fetch",
            link: "/packages/plgg-fetch",
          },
          {
            text: "plgg-router",
            link: "/packages/plgg-router",
          },
          {
            text: "plgg-view",
            link: "/packages/plgg-view",
          },
          {
            text: "plgg-sql",
            link: "/packages/plgg-sql",
          },
          {
            text: "plgg-kit",
            link: "/packages/plgg-kit",
          },
          {
            text: "plgg-foundry",
            link: "/packages/plgg-foundry",
          },
          {
            text: "example (tutorial)",
            link: "/packages/example",
          },
        ],
      },
      {
        text: "API reference",
        items: [
          {
            text: "Overview",
            link: "/api/",
          },
        ],
      },
      {
        text: "Contributing",
        items: [
          {
            text: "Doc conventions",
            link: "/contributing/conventions",
          },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/qmu/plgg",
      },
    ],
  },
});
