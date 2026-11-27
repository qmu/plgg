import { pageWidget } from "../src/site/pagePart.ts";

// The one part the guide's site adds: a page of the
// catalog, drawn as the site is built and operated through
// the catalog's own program.
export default {
  parts: [
    {
      name: "plggmatic-page",
      css: "",
      render: (code: string) =>
        pageWidget(code.trim()),
      runtime: new URL(
        "../dist/site-island.js",
        import.meta.url,
      ).href,
    },
  ],
};
