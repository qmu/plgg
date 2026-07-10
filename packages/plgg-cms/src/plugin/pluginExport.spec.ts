import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { collectionSchema } from "plgg-cms/content";
import {
  mcpJson,
  pluginManifest,
  skillForCollection,
  skillsFromCollections,
  marketplaceManifest,
} from "plgg-cms/plugin/pluginExport";

test("mcpJson points an http MCP server at the instance /mcp endpoint", () => {
  const j = mcpJson(
    "https://docs.example/mcp",
  );
  const s = j.mcpServers["plggpress"];
  return all([
    check(s?.type ?? "", toBe("http")),
    check(
      s?.url ?? "",
      toBe("https://docs.example/mcp"),
    ),
  ]);
});

test("pluginManifest carries name/version/description", () => {
  const m = pluginManifest(
    "acme-docs",
    "1.0.0",
    "Acme knowledge base",
  );
  return all([
    check(m.name, toBe("acme-docs")),
    check(m.version, toBe("1.0.0")),
  ]);
});

test("a skill is generated per collection, wired to the MCP tools", () => {
  const skill = skillForCollection(
    collectionSchema("guides", []),
  );
  return all([
    check(skill.name, toBe("search-guides")),
    check(
      skill.body.includes("search_content"),
      toBe(true),
    ),
    check(
      skill.body.includes("get_article"),
      toBe(true),
    ),
    check(
      skill.body.includes('collection: "guides"'),
      toBe(true),
    ),
  ]);
});

test("skillsFromCollections maps every collection", () => {
  const skills = skillsFromCollections([
    collectionSchema("blog", []),
    collectionSchema("docs", []),
  ]);
  return all([
    check(skills.length, toBe(2)),
    check(
      skills[1]?.name ?? "",
      toBe("search-docs"),
    ),
  ]);
});

test("marketplaceManifest lists the generated plugin", () => {
  const m = marketplaceManifest(
    "acme",
    "acme-docs",
    "./acme-docs",
    "Acme knowledge base",
  );
  return all([
    check(m.owner, toBe("acme")),
    check(m.plugins.length, toBe(1)),
    check(
      m.plugins[0]?.name ?? "",
      toBe("acme-docs"),
    ),
  ]);
});
