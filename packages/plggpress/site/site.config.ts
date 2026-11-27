import { joinedTo } from "../../../sites.ts";

export default {
  title: "plggpress",
  description:
    "A static site generator on the plgg family: Markdown pages that open beside one another as columns.",
  base: "/",
  nav: [],
  sidebarStyle: "tree",
  sidebarGroups: "toggle",
  controls: "sidebar",
  sidebar: [
    {
      text: "plggpress",
      items: [
        {
          text: "Overview",
          link: "/",
          items: [],
        },
        {
          text: "Sites joined by columns",
          link: "/joining",
          items: [],
        },
        {
          text: "Sheets and islands",
          link: "/sheets",
          items: [],
        },
        {
          text: "Operations",
          link: "/operations",
          items: [],
        },
      ],
    },
  ],
  social: [],
  dev: { allowedHosts: [] },
  // joined to the other qmu sites by columns
  ...joinedTo("https://plggpress.qmu.co.jp"),
};
