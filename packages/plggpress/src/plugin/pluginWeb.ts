import {
  type SoftStr,
  type PromisedResult,
  ok,
  err,
  pipe,
  matchResult,
} from "plgg";
import {
  type Web,
  type Context,
  type HttpResponse,
  type HttpError,
  web,
  get,
  jsonResponse,
  internalError,
} from "plggpress/framework";
import {
  type Db,
  type CollectionSchema,
  listCollections,
} from "plgg-content";
import {
  mcpJson,
  pluginManifest,
  marketplaceManifest,
  skillsFromCollections,
} from "plggpress/plugin/pluginExport";

/** What an instance needs to describe itself as an installable plugin. */
export type PluginConfig = Readonly<{
  owner: SoftStr;
  pluginName: SoftStr;
  version: SoftStr;
  description: SoftStr;
  source: SoftStr;
  mcpUrl: SoftStr;
}>;

const jsonOf = (
  data: unknown,
): PromisedResult<HttpResponse, HttpError> =>
  Promise.resolve(ok(jsonResponse(data)));

/**
 * The Claude Code plugin-export endpoints (ticket 30, D17) — a
 * served plggpress advertising itself as an installable plugin:
 *
 * - `GET /.claude-plugin/marketplace.json` — the marketplace so
 *   `/plugin marketplace add <instance>` finds it;
 * - `GET /.claude-plugin/plugin.json` — the plugin manifest;
 * - `GET /.mcp.json` — points Claude Code at THIS instance's
 *   OAuth-aware `/mcp` endpoint;
 * - `GET /.claude-plugin/skills.json` — one skill per content
 *   collection, generated LIVE from {@link listCollections}, so
 *   the plugin regenerates with the corpus (a store error → 500).
 *
 * Static, GET-only, public — the same content the SSG already
 * publishes. Never throws.
 */
export const pluginWeb = (
  db: Db,
  config: PluginConfig,
): Web =>
  pipe(
    web(),
    get("/.claude-plugin/marketplace.json", () =>
      jsonOf(
        marketplaceManifest(
          config.owner,
          config.pluginName,
          config.source,
          config.description,
        ),
      ),
    ),
    get("/.claude-plugin/plugin.json", () =>
      jsonOf(
        pluginManifest(
          config.pluginName,
          config.version,
          config.description,
        ),
      ),
    ),
    get("/.mcp.json", () =>
      jsonOf(mcpJson(config.mcpUrl)),
    ),
    get(
      "/.claude-plugin/skills.json",
      (
        _c: Context,
      ): PromisedResult<
        HttpResponse,
        HttpError
      > =>
        listCollections(db).then(
          matchResult<
            ReadonlyArray<CollectionSchema>,
            { content: { message: SoftStr } },
            import("plgg").Result<
              HttpResponse,
              HttpError
            >
          >(
            (e) =>
              err(
                internalError(
                  e.content.message,
                ),
              ),
            (cols) =>
              ok(
                jsonResponse(
                  skillsFromCollections(cols),
                ),
              ),
          ),
        ),
    ),
  );
