# plgg-cms — Serve and manage content

Run the `plgg-cms` server when readers need searchable content or editors need an admin interface. It provides a content index, a read-only delivery API, and media management. Editor sign-in uses [plgg-auth](/packages/plgg-auth/), and tools can be called through [MCP](/packages/plgg-mcp/).

With a `site.config.ts` and a `docs` content directory, start the server with `npx plgg-cms serve --contentDir docs`. When serving at the root, open `/api/collections` to list collections or `/admin` for the editor interface.

To publish Markdown as static files, follow the [plggpress publishing guide](https://plggpress.qmu.co.jp/en/operations/).

## Working with the API

`contentApi(db, embedder) → Web`

Index the corpus so the delivery API and editor refer to the same documents. `contentApi` constructs a read-only `Web` over a database. Editing and authentication need the larger server composition. A static build suffices for file-only delivery.

```ts
import { asListQuery } from "plgg-cms";

console.log(
  asListQuery({ orderBy: "title", limit: "5" }),
);
console.log(asListQuery({ limit: "-1" }).__tag);
```

## Validate list parameters

`asListQuery`(params) supplies defaults for omitted fields. The sort key is title or updated_at and direction is asc or desc. A negative limit yields a validation error instead of resetting to a default. This distinguishes an empty collection from an invalid request.
