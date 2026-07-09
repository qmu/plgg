import {
  type SoftStr,
  type Dict,
} from "plgg";
import { type CollectionSchema } from "plgg-cms/content";

/**
 * The `.mcp.json` a served plggpress hands Claude Code (ticket
 * 30, D17): one `http` MCP server pointing at THIS instance's
 * OAuth-aware `/mcp` endpoint, so an installed plugin talks to
 * the live content index. Regenerated per instance (the URL is
 * the deployed origin).
 */
export type McpJson = Readonly<{
  mcpServers: Dict<
    string,
    Readonly<{ type: "http"; url: SoftStr }>
  >;
}>;

/** Build the `.mcp.json` for a served instance's `/mcp` endpoint. */
export const mcpJson = (
  mcpUrl: SoftStr,
): McpJson => ({
  mcpServers: {
    plggpress: { type: "http", url: mcpUrl },
  },
});

/** The `.claude-plugin/plugin.json` manifest. */
export type PluginManifest = Readonly<{
  name: SoftStr;
  version: SoftStr;
  description: SoftStr;
}>;

export const pluginManifest = (
  name: SoftStr,
  version: SoftStr,
  description: SoftStr,
): PluginManifest => ({
  name,
  version,
  description,
});

/**
 * A generated skill — a Markdown instruction file teaching
 * Claude Code HOW to reach one content collection through the
 * MCP tools. Derived from the index's structure (D17: "skills
 * generated from content structure"), so the plugin stays in
 * sync with the corpus.
 */
export type Skill = Readonly<{
  name: SoftStr;
  description: SoftStr;
  body: SoftStr;
}>;

/** One skill per collection, pointing at the MCP search/get tools. */
export const skillForCollection = (
  c: CollectionSchema,
): Skill => ({
  name: `search-${c.name}`,
  description: `Search and read the "${c.name}" collection from the plggpress knowledge base.`,
  body: `# Searching ${c.name}

Use the plggpress MCP tools to answer questions from the **${c.name}** collection:

1. Call \`search_content\` with the user's query to find relevant articles (returns paths + section headings).
2. Call \`get_article\` with \`collection: "${c.name}"\` and a path from the search to read the full article.
3. Ground your answer in the returned content; cite the article path.
`,
});

/** Skills for every collection in the index. */
export const skillsFromCollections = (
  collections: ReadonlyArray<CollectionSchema>,
): ReadonlyArray<Skill> =>
  collections.map(skillForCollection);

/** One plugin listing inside a marketplace manifest. */
export type MarketplaceEntry = Readonly<{
  name: SoftStr;
  source: SoftStr;
  description: SoftStr;
}>;

/**
 * The marketplace manifest (`.claude-plugin/marketplace.json`)
 * the instance serves, so a user runs
 * `/plugin marketplace add <instance-url>` and installs the
 * generated plugin.
 */
export type MarketplaceManifest = Readonly<{
  name: SoftStr;
  owner: SoftStr;
  plugins: ReadonlyArray<MarketplaceEntry>;
}>;

export const marketplaceManifest = (
  owner: SoftStr,
  pluginName: SoftStr,
  source: SoftStr,
  description: SoftStr,
): MarketplaceManifest => ({
  name: `${owner}-plggpress`,
  owner,
  plugins: [
    { name: pluginName, source, description },
  ],
});
