// Public barrel for plgg-cms — the dynamic content-
// management surface that composes onto plggpress's
// framework seam and serves the always-on half (D5).

// The content query/index surface is owned by plgg-cms. These
// exports keep the HTTP, admin, plugin, MCP, and agent surfaces
// on the same in-process content/query vocabulary.
export * from "plgg-cms/content";

// The MCP protocol/tooling core is also internal to plgg-cms:
// the HTTP mount and stdio transport share the same dispatch,
// tool registry, and JSON-RPC frame handling.
export * from "plgg-cms/mcpProtocol";

// The durable-core derivation spine formerly lived behind a
// standalone package. CMS now owns it so schema derivation,
// export/import, and shell regeneration stay with the
// content-management surface that uses them.
export * from "plgg-cms/domainCore";

// The read-only delivery API (D4/D11) — a thin plgg-server
// Web sub-app over plgg-cms/content's in-process query
// functions, mounted at the pressServeWeb seam via
// `route("/api", ... )`.
export { contentApi } from "plgg-cms/api/contentApi";

// The served-app factory: the SAME router shape `build`
// renders through (so served HTML ≡ generated HTML),
// composed with the dynamic `/api`, `/admin`, `/auth`,
// `/mcp` mounts. `pressServeWebWithAuth` adds the OIDC
// auth layer on top of `pressServeWeb`.
export {
  pressServeWeb,
  pressServeWebWithAuth,
} from "plgg-cms/server/pressServer";
