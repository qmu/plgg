// Auto-generate the API reference for every plgg-family package as a *compact
// signature index*, split one page per category, and emit a per-package
// VitePress sidebar map that `.vitepress/config.ts` splices under each package.
//
// For each package we run TypeDoc (markdown + VitePress theme) against the
// package's OWN source `index.ts` using its OWN tsconfig, so cross-package
// types resolve through the built `dist` symlinks (the dependency-ordered build
// is a prerequisite — see workloads/development/Dockerfile and the deploy CI).
// Output lands in `api/<pkg>/`: one page per source-derived category
// (`atomics.md`, `basics.md`, …) plus a landing `index.md` at `/api/<pkg>/`
// (single-category packages skip the landing — their one page IS the landing).
// Each run also rewrites `api/typedoc-sidebar.json` as a per-package map keyed
// by package name, each entry carrying the landing link and one leaf per
// category; `.vitepress/config.ts` loads that map when present.
//
// TypeDoc renders every symbol with full `#### Type Parameters` / `#### Parameters`
// / `#### Returns` sub-tables. For a functional library the signature already
// says everything, so we POST-PROCESS each generated `index.md` into a compact
// index: per public symbol we keep the heading, the signature code block, and
// the one-line summary, drop the sub-tables, and regroup entries under the
// source-derived README categories (Atomics, Basics, Disjunctives, …), emitting
// each category as its OWN page. The reference stays comprehensive (every public
// symbol still listed) and auto-generated, but is far shorter and scannable.
// The `@internal`/`exclude` curation upstream still decides what is public.
//
// Run: `npm run docs:api` (invoked by `npm run build` before `vitepress build`).

import { execFileSync } from "node:child_process";
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import {
  dirname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const guideRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packagesRoot = resolve(guideRoot, "..");
const apiDir = join(guideRoot, "api");

// The plgg family, in dependency order (matches the dev Dockerfile build
// order). Each is generated independently from its own source.
const PACKAGES = [
  "plgg",
  "plgg-http",
  "plgg-router",
  "plgg-view",
  "plgg-server",
  "plgg-fetch",
  "plgg-sql",
  "plgg-kit",
  "plgg-foundry",
  "plgg-test",
];

// Top-level `src/<Dir>/` directories that TypeDoc excludes from the docs
// (mirrors `typedoc.base.json` `exclude`), so their symbols never appear and we
// skip them when deriving categories.
const EXCLUDED_DIRS = [
  "Abstracts",
  "Grammaticals",
];

// Preferred ordering for the plgg core taxonomy (the README's category order).
// Categories not listed here (other packages' Http, Routing, … and the catch-all
// "Other") follow, alphabetically, with "Other" always last.
const PREFERRED_CATEGORY_ORDER = [
  "Atomics",
  "Basics",
  "Disjunctives",
  "Contextuals",
  "Conjunctives",
  "Collectives",
  "Exceptionals",
  "Flowables",
  "Functionals",
];

const OTHER_CATEGORY = "Other";

const generate = (pkg) => {
  const pkgRoot = join(packagesRoot, pkg);
  const out = join(apiDir, pkg);
  // Clean stale output so removed exports don't linger.
  rmSync(out, { recursive: true, force: true });
  execFileSync(
    "npx",
    [
      "typedoc",
      "--options",
      join(guideRoot, "typedoc.base.json"),
      "--tsconfig",
      join(pkgRoot, "tsconfig.json"),
      "--entryPoints",
      join(pkgRoot, "src", "index.ts"),
      "--out",
      out,
    ],
    { cwd: guideRoot, stdio: "inherit" },
  );
};

// Recursively list every non-spec `.ts` source file under `dir`.
const listSourceFiles = (dir) => {
  const entries = readdirSync(dir, {
    withFileTypes: true,
  });
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(full);
    }
    if (
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".spec.ts") &&
      !entry.name.endsWith(".test.ts")
    ) {
      return [full];
    }
    return [];
  });
};

// Parse the public names from an `export { … }` clause body: `a, b as c,
// type D` yields `a`, `c`, `D` (the renamed target / declared name).
const parseExportNames = (inner) =>
  inner
    .split(",")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((token) =>
      token
        .split(/\s+as\s+/)
        .pop()
        .replace(/^type\s+/, "")
        .trim(),
    )
    .filter(Boolean);

// The plgg package a re-export specifier resolves to, or null when it is
// relative, internal (same package), or a third-party module. `"plgg-http"`
// and `"plgg-http/Http/model"` both resolve to `plgg-http`.
const reexportPackage = (spec, selfPkg) => {
  const first = spec.split("/")[0];
  if (
    first === selfPkg ||
    !PACKAGES.includes(first)
  ) {
    return null;
  }
  return first;
};

// Statically analyse one package's source into the parts needed to categorise
// its documented symbols:
//   local       — name → category for symbols DECLARED in this package, keyed by
//                 the top-level `src/<Category>/` directory (root-level files →
//                 "Other").
//   crossNamed  — { category, names } for `export { … } from "<other-pkg>"`.
//   crossStars  — { category, pkg }  for `export * from "<other-pkg>"`, resolved
//                 later against the target package's own symbol set.
// Cross-package re-exports are categorised by the re-exporting file's location
// (the aggregator's own taxonomy), while in-package symbols are categorised at
// their declaration site.
const analyzePackage = (pkgRoot, selfPkg) => {
  const srcRoot = join(pkgRoot, "src");
  const local = new Map();
  const crossNamed = [];
  const crossStars = [];
  for (const file of listSourceFiles(srcRoot)) {
    const rel = relative(srcRoot, file);
    const parts = rel.split(sep);
    const category =
      parts.length > 1
        ? parts[0]
        : OTHER_CATEGORY;
    if (EXCLUDED_DIRS.includes(category)) {
      continue;
    }
    const text = readFileSync(file, "utf8");

    // Record cross-package re-exports before stripping them.
    const namedFromRe =
      /export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/g;
    for (
      let m = namedFromRe.exec(text);
      m;
      m = namedFromRe.exec(text)
    ) {
      if (reexportPackage(m[2], selfPkg)) {
        crossNamed.push({
          category,
          names: parseExportNames(m[1]),
        });
      }
    }
    const starFromRe =
      /export\s+\*\s+(?:as\s+([A-Za-z0-9_$]+)\s+)?from\s+["']([^"']+)["']/g;
    for (
      let m = starFromRe.exec(text);
      m;
      m = starFromRe.exec(text)
    ) {
      const target = reexportPackage(
        m[2],
        selfPkg,
      );
      if (!target) {
        continue;
      }
      if (m[1]) {
        // `export * as NS from …` — the namespace binding is itself the symbol.
        crossNamed.push({
          category,
          names: [m[1]],
        });
      } else {
        crossStars.push({
          category,
          pkg: target,
        });
      }
    }

    // Drop all re-exports (`export * from`, `export { … } from`, incl. multiline
    // brace blocks) so only this file's own declarations remain.
    const body = text.replace(
      /export\s+(?:type\s+)?(?:\*(?:\s+as\s+[A-Za-z0-9_$]+)?|\{[^}]*\})\s+from\s+["'][^"']+["']\s*;?/g,
      "",
    );
    const add = (name) => {
      if (!name) {
        return;
      }
      const existing = local.get(name);
      if (existing && existing !== category) {
        console.warn(
          `gen-api: symbol "${name}" maps to both "${existing}" and "${category}"; keeping "${existing}".`,
        );
        return;
      }
      local.set(name, category);
    };
    // `export const|function|type|interface|class|… NAME`
    const declRe =
      /export\s+(?:async\s+)?(?:function|const|let|var|type|interface|class|abstract\s+class|declare\s+const)\s+([A-Za-z0-9_$]+)/g;
    for (
      let m = declRe.exec(body);
      m;
      m = declRe.exec(body)
    ) {
      add(m[1]);
    }
    // Destructured exports: `export const { chain: chainOption } = optionChain;`
    // — the public name is the renamed target (or the bare key).
    const destructureRe =
      /export\s+const\s+\{([^}]*)\}\s*=/g;
    for (
      let m = destructureRe.exec(body);
      m;
      m = destructureRe.exec(body)
    ) {
      for (const raw of m[1].split(",")) {
        const token = raw.trim();
        if (!token) {
          continue;
        }
        add(token.split(":").pop().trim());
      }
    }
    // Local `export { a, b as c };` blocks (the `from` ones are gone already).
    const braceRe =
      /export\s+(?:type\s+)?\{([^}]*)\}/g;
    for (
      let m = braceRe.exec(body);
      m;
      m = braceRe.exec(body)
    ) {
      for (const name of parseExportNames(m[1])) {
        add(name);
      }
    }
  }
  return { local, crossNamed, crossStars };
};

// Combine a package's local declarations with its cross-package re-exports into
// one name → category map. Local declarations win; cross-package re-exports only
// fill names not declared in-package (named clauses directly, `export *` clauses
// via the target package's own symbol set).
const resolveCategoryMap = (
  selfPkg,
  analyses,
) => {
  const analysis = analyses[selfPkg];
  const map = new Map(analysis.local);
  const fill = (name, category) => {
    if (name && !map.has(name)) {
      map.set(name, category);
    }
  };
  for (const {
    category,
    names,
  } of analysis.crossNamed) {
    for (const name of names) {
      fill(name, category);
    }
  }
  for (const {
    category,
    pkg,
  } of analysis.crossStars) {
    const target = analyses[pkg];
    if (!target) {
      continue;
    }
    for (const name of target.local.keys()) {
      fill(name, category);
    }
  }
  return map;
};

// Order the categories that actually carry symbols: the preferred plgg taxonomy
// first, then any remaining categories alphabetically, with "Other" last.
const orderCategories = (present) => {
  const ordered = PREFERRED_CATEGORY_ORDER.filter(
    (c) => present.has(c),
  );
  const rest = [...present]
    .filter(
      (c) =>
        !PREFERRED_CATEGORY_ORDER.includes(c) &&
        c !== OTHER_CATEGORY,
    )
    .sort();
  const tail = present.has(OTHER_CATEGORY)
    ? [OTHER_CATEGORY]
    : [];
  return [...ordered, ...rest, ...tail];
};

// URL-safe slug for a category's own reference page (e.g. "Atomics" ->
// "atomics"), used for the `/api/<pkg>/<slug>` page links and sidebar leaves.
const categorySlug = (category) =>
  category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Transform one TypeDoc `index.md` into the compact signature index — drop the
// `#### …` sub-tables and the `***` separators / kind-group `##` headings, keep
// each symbol's heading + signature + one-line summary — and split it into one
// page per source-derived category. Returns `{ title, pages }` where `pages` is
// ordered (orderCategories) and each page is `{ category, slug, content }`; the
// caller writes the pages and builds the sidebar. Fence-aware so `#`/`***`
// inside a ```ts code block are never mistaken for structure.
const compact = (md, categoryMap, pkg) => {
  const lines = md.split("\n");
  const title =
    lines.find((l) => /^# /.test(l)) ??
    `# ${pkg}`;

  const blocks = [];
  let cur = null;
  let inFence = false;
  let originalSymbols = 0;

  const finalize = (block) => {
    while (
      block.body.length &&
      (block.body[
        block.body.length - 1
      ].trim() === "" ||
        block.body[
          block.body.length - 1
        ].trim() === "***")
    ) {
      block.body.pop();
    }
    while (
      block.body.length &&
      block.body[0].trim() === ""
    ) {
      block.body.shift();
    }
    block.category =
      categoryMap.get(block.name) ??
      OTHER_CATEGORY;
    blocks.push(block);
  };

  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      if (cur && !cur.stripping) {
        cur.body.push(line);
      }
      continue;
    }
    if (!inFence && /^### /.test(line)) {
      if (cur) {
        finalize(cur);
      }
      originalSymbols += 1;
      const name = line
        .replace(/^### /, "")
        .replace(/\(\)$/, "")
        // TypeDoc escapes markdown-significant chars in headings (e.g.
        // `ICON\_CONTENT`); unescape to match the source-derived map key.
        .replace(/\\(.)/g, "$1")
        .trim();
      cur = {
        name,
        heading: line,
        body: [],
        stripping: false,
      };
      continue;
    }
    if (!cur) {
      // Preamble before the first symbol (title + any kind-group heading): kept
      // only as the title, emitted below.
      continue;
    }
    if (!inFence && /^#### /.test(line)) {
      cur.stripping = true;
      continue;
    }
    if (cur.stripping) {
      // Skip the sub-table until the next structural boundary; `### ` already
      // handled above, so here we end stripping at `## `/`# `/`***`.
      if (
        !inFence &&
        (/^#{1,2} /.test(line) ||
          /^\*\*\*\s*$/.test(line))
      ) {
        cur.stripping = false;
      }
      continue;
    }
    if (!inFence && /^#{1,2} /.test(line)) {
      // An old kind-group heading (`## Type Aliases`) between symbols — drop it.
      continue;
    }
    if (!inFence && /^\*\*\*\s*$/.test(line)) {
      // Per-symbol separator — drop it.
      continue;
    }
    cur.body.push(line);
  }
  if (cur) {
    finalize(cur);
  }

  if (blocks.length !== originalSymbols) {
    throw new Error(
      `gen-api: compaction lost symbols for ${pkg} (parsed ${blocks.length} of ${originalSymbols}).`,
    );
  }

  const byCategory = new Map();
  for (const block of blocks) {
    if (!byCategory.has(block.category)) {
      byCategory.set(block.category, []);
    }
    byCategory.get(block.category).push(block);
  }

  const pages = orderCategories(
    new Set(byCategory.keys()),
  ).map((category) => {
    const out = [`# ${category}`, ""];
    for (const block of byCategory.get(
      category,
    )) {
      // The category is now the page `#` heading, so promote each symbol to a
      // top-level `##` heading (it shows in the page outline that way).
      out.push(
        block.heading.replace(/^### /, "## "),
        "",
      );
      out.push(...block.body, "");
    }
    return {
      category,
      slug: categorySlug(category),
      content:
        out
          .join("\n")
          .replace(/\n{3,}/g, "\n\n")
          .trimEnd() + "\n",
    };
  });
  return { title, pages };
};

// The landing page at `/api/<pkg>/` for a multi-category package: the package
// title plus a link list into the per-category pages. Single-category packages
// skip this — their one category page is written directly as the landing.
const landingPage = (title, pkg, pages) =>
  [
    title,
    "",
    `The \`${pkg}\` API reference, by category.`,
    "",
    ...pages.map(
      (page) =>
        `- [${page.category}](/api/${pkg}/${page.slug})`,
    ),
  ].join("\n") + "\n";

// The reference sidebar is generated as a per-package map keyed by package name;
// `.vitepress/config.ts` looks up each package's entry and splices it (the
// landing link plus the per-category leaves) under that package's group. We
// intentionally discard the theme's per-symbol `typedoc-sidebar.json`.
const apiSidebar = {};

// Analyse every package first so cross-package `export *` re-exports can be
// resolved against the target package's own symbol set.
const analyses = {};
for (const pkg of PACKAGES) {
  analyses[pkg] = analyzePackage(
    join(packagesRoot, pkg),
    pkg,
  );
}

for (const pkg of PACKAGES) {
  generate(pkg);
  const out = join(apiDir, pkg);
  const indexPath = join(out, "index.md");
  const categoryMap = resolveCategoryMap(
    pkg,
    analyses,
  );
  const { title, pages } = compact(
    readFileSync(indexPath, "utf8"),
    categoryMap,
    pkg,
  );
  if (pages.length <= 1) {
    // One (or zero) category: the single page IS the landing at `/api/<pkg>/`,
    // so the sidebar entry is just the package link with no category leaves.
    writeFileSync(
      indexPath,
      pages.length
        ? pages[0].content
        : `${title}\n`,
    );
    apiSidebar[pkg] = {
      link: `/api/${pkg}/`,
      items: [],
    };
    continue;
  }
  // Multiple categories: one page per category plus a landing index linking into
  // them; the sidebar entry carries one leaf per category.
  for (const page of pages) {
    writeFileSync(
      join(out, `${page.slug}.md`),
      page.content,
    );
  }
  writeFileSync(
    indexPath,
    landingPage(title, pkg, pages),
  );
  apiSidebar[pkg] = {
    link: `/api/${pkg}/`,
    items: pages.map((page) => ({
      text: page.category,
      link: `/api/${pkg}/${page.slug}`,
    })),
  };
}

writeFileSync(
  join(apiDir, "typedoc-sidebar.json"),
  JSON.stringify(apiSidebar, null, 2) + "\n",
);

console.log(
  `Generated compact API reference for ${PACKAGES.length} packages.`,
);
