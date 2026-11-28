# plggpress — Publish a Markdown site

plggpress turns Markdown into static pages, including the pages in this guide. Build a two-page handbook in the [plggpress walkthrough](https://plggpress.qmu.co.jp/en/start/).

## Working with the API

`defineSite(input: SiteConfigInput) → Result<SiteConfig, InvalidError>`

This guide selects a locale-specific base and sidebar in one config. Config validation, Markdown parsing and link checks precede static delivery. Define a `contentModel` and `bindModel` when a set of pages needs structured frontmatter. Runtime editing and authentication belong to the CMS.

```ts
import { defineSite } from "plggpress";

const site = defineSite({
  title: "Books",
  description: "Reading notes",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
});
console.log(site.__tag);
```

## Reproduce a broken link without building a site

The checker needs the route, the IDs of headings and the outgoing links for each page. Here /books/ exists but #old does not. Change the fragment to #titles and the check passes. If a page name looks right, inspect renamed or moved headings too.

```ts
import { checkLinks, pageLinks } from "plggpress";

const books = pageLinks(
  "/books/",
  ["titles"],
  [],
);
const check = (href: string) =>
  checkLinks("/")([
    pageLinks("/", [], [href]),
    books,
  ]);
console.log(
  check("/books/#old").__tag,
  check("/books/#titles").__tag,
);
```
