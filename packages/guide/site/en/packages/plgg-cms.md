# plgg-cms — Serve and manage content

Run the `plgg-cms` server when readers need searchable content or editors need an admin interface. It provides a content index, a read-only delivery API, and media management. Editor sign-in uses [plgg-auth](/packages/plgg-auth/), and tools can be called through [MCP](/packages/plgg-mcp/).

With a `site.config.ts` and a `docs` content directory, start the server with `npx plgg-cms serve --contentDir docs`. When serving at the root, open `/api/collections` to list collections or `/admin` for the editor interface.

To publish Markdown as static files, follow the [plggpress publishing guide](https://plggpress.qmu.co.jp/en/operations/).
