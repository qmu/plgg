// Guide-side render-VERIFICATION: the loud drift gate that
// proves the REAL guide renders through plgg-press with the
// same anchors and link forms VitePress emitted, and with
// the in-house generator's defining property — ZERO client
// JS — held. It regenerates the theme-less API Markdown
// (`docs:api`), renders the SAMPLED API pages through the
// real plgg-press pipeline, and diffs the result against the
// ticket-1 golden reference (`scripts/golden-render.json`,
// blessed from the spike's VitePress snapshots). A typedoc
// bump or a slug-algorithm regression that breaks parity
// fails HERE, before deploy.
//
// Two render paths, both the REAL pipeline:
//   * `collectPageLinks` renders each sampled route's
//     Markdown through plgg-press's own renderer and
//     projects the emitted heading slugs + link forms. It
//     reads files by route (no corpus crawl), so it is
//     immune to the discoverPaths node_modules-symlink walk.
//   * `build` writes the link-clean `atomics` sample to disk
//     exactly as the deploy build does, so the emitted HTML
//     can be asserted free of `<script>` and of raw
//     angle-bracket passthrough, with `404.html` present.
//
// Parity is asserted as VitePress-anchor REPRODUCTION
// (golden heading ids ⊆ emitted slugs): every id VitePress
// emitted must still resolve, so old in-site `#fragment`
// links keep working. The stable `atomics` page is asserted
// EXACTLY (no drift in either direction); `plgg-view`'s
// landing is `subset` because its documented surface has
// grown since the snapshot (new symbols are not drift). The
// negative check drifts a heading and asserts the gate
// fails loudly.
//
// Run: `npm run verify:render`.

import { execFileSync } from "node:child_process";
import { register } from "node:module";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(
  fileURLToPath(import.meta.url),
);
const guideRoot = resolve(scriptsDir, "..");
const pressBin = resolve(
  guideRoot,
  "..",
  "plgg-press",
);

// Resolve `plgg-press/<sub>` self-alias specifiers to the
// on-disk source, exactly as the plgg-press bin does, so
// this script imports the SAME pipeline the CLI runs.
register(
  join(pressBin, "bin", "hook.mjs"),
  import.meta.url,
);

// Import the pipeline from SOURCE via the hook-resolved
// self-alias subpaths — exactly the modules the CLI loads —
// rather than the bare barrel (which resolves to the bundled
// dist whose `loadConfig` dynamic import behaves differently
// for a `.ts` config). Dynamic `import` so it runs AFTER the
// hook is registered (static imports would hoist above it).
const { collectPageLinks } =
  await import("plgg-press/CheckLinks/usecase/collectPageLinks");
const { build } =
  await import("plgg-press/build");
const { loadConfig } =
  await import("plgg-press/Config/usecase/loadConfig");
const { isExternalHref } =
  await import("plgg-press/Href/usecase/href");

// The deploy base the golden snapshots were rendered at
// (root). The href resolver prefixes links with it, so the
// emitted link forms compare against the golden as-is.
const BASE = "/";

// A loud failure: print and exit non-zero so the gate breaks
// the build on drift rather than shipping degraded pages.
const fail = (message) => {
  process.stderr.write(
    `verify:render FAILED — ${message}\n`,
  );
  process.exit(1);
};

// Unwrap a plgg `Result`, failing the gate on the Err arm.
const expectOk = (result, label) => {
  if (result.__tag !== "Ok") {
    fail(
      `${label}: ${JSON.stringify(
        result.content,
      ).slice(0, 400)}`,
    );
  }
  return result.content;
};

// Render the sampled routes through the real plgg-press
// renderer and index them by route → { slugs, links }.
const renderPages = async (
  contentDir,
  routes,
) => {
  const pages = expectOk(
    await collectPageLinks(
      contentDir,
      BASE,
    )(routes),
    "collectPageLinks",
  );
  return new Map(
    pages.map((p) => [
      p.route,
      { slugs: p.slugs, links: p.links },
    ]),
  );
};

// The link forms the spike pinned (section 6g): root-
// absolute extension-less, bare `#fragment`, or external.
// A `.md` suffix or a `./`/`../` relative target is drift.
const isAllowedLinkForm = (link) =>
  isExternalHref(link) ||
  ((link.startsWith("#") ||
    link.startsWith("/")) &&
    !/\.md(#|$)/.test(link) &&
    !/^\.\.?\//.test(link));

// ── Step 1: regenerate the theme-less API Markdown ────────
console.log(
  "verify:render — regenerating API Markdown (docs:api)…",
);
execFileSync(
  "node",
  [join(scriptsDir, "gen-api.mjs")],
  { cwd: guideRoot, stdio: "inherit" },
);

// ── Step 2: render the sampled API pages (real pipeline) ──
const golden = JSON.parse(
  readFileSync(
    join(scriptsDir, "golden-render.json"),
    "utf8",
  ),
);
const sampleRoutes = golden.pages.map(
  (p) => p.route,
);
const rendered = await renderPages(
  guideRoot,
  sampleRoutes,
);

// ── Step 3: diff anchors + link forms against golden ──────
for (const page of golden.pages) {
  const got = rendered.get(page.route);
  if (!got) {
    fail(`no rendered output for ${page.route}`);
  }
  const emitted = new Set(got.slugs);
  // Anchor reproduction: every golden heading id must be an
  // emitted slug, so every link VitePress could resolve
  // still resolves under plgg-press.
  const missing = page.headingIds.filter(
    (id) => !emitted.has(id),
  );
  if (missing.length > 0) {
    fail(
      `${page.route}: ${missing.length} golden anchor(s) NOT reproduced: ${missing
        .slice(0, 8)
        .join(", ")}`,
    );
  }
  // The stable page must match EXACTLY — extra slugs there
  // are a real regression, not documented-surface growth.
  if (page.mode === "exact") {
    const goldenSet = new Set(page.headingIds);
    const extra = got.slugs.filter(
      (s) => !goldenSet.has(s),
    );
    if (extra.length > 0) {
      fail(
        `${page.route} (exact): unexpected emitted anchor(s): ${extra
          .slice(0, 8)
          .join(", ")}`,
      );
    }
  }
  // Link-form parity: no `.md`/relative leakage.
  const badLinks = got.links.filter(
    (l) => !isAllowedLinkForm(l),
  );
  if (badLinks.length > 0) {
    fail(
      `${page.route}: disallowed link form(s): ${badLinks
        .slice(0, 8)
        .join(", ")}`,
    );
  }
  console.log(
    `  ok ${page.route} — ${page.headingIds.length} golden anchors reproduced (${page.mode}), ${got.links.length} links well-formed`,
  );
}

// ── Step 4: emitted-HTML parity on a link-clean sample ────
// Stage the (link-free) `atomics` page as its own corpus and
// run the REAL build so the written HTML can be asserted.
const atomicsRoute = "/api/plgg/atomics";
const tmp = mkdtempSync(
  join(tmpdir(), "plgg-verify-render-"),
);
try {
  const stageDir = join(tmp, "content");
  const outDir = join(tmp, "out");
  cpSync(
    join(guideRoot, "api", "plgg", "atomics.md"),
    join(stageDir, "api", "plgg", "atomics.md"),
    { recursive: true },
  );
  const config = expectOk(
    await loadConfig(
      join(guideRoot, "site.config.ts"),
    ),
    "loadConfig",
  );
  const report = expectOk(
    await build({
      contentDir: stageDir,
      outDir,
      assetsDir: join(stageDir, "public"),
      config,
      base: BASE,
      dev: false,
      allowedHosts: config.dev.allowedHosts,
    }),
    "build(atomics sample)",
  );
  // 404.html must always be emitted.
  const emittedFiles = readdirSync(outDir);
  if (!emittedFiles.includes("404.html")) {
    fail(
      `sample build emitted no 404.html (got ${emittedFiles.join(", ")})`,
    );
  }
  const html = readFileSync(
    join(
      outDir,
      "api",
      "plgg",
      "atomics",
      "index.html",
    ),
    "utf8",
  );
  // The in-house generator ships ZERO client JS (VitePress
  // shipped 4 `<script>` tags). A single one is drift.
  const scriptCount = (
    html.match(/<script/g) || []
  ).length;
  if (scriptCount !== 0) {
    fail(
      `sample HTML has ${scriptCount} <script> tag(s) (must be 0; VitePress had ${golden.vitepressScriptCount})`,
    );
  }
  // No raw angle-bracket passthrough: signature generics
  // (`Brand<T>`, …) must be HTML-escaped, never live tags.
  if (!/&lt;|&gt;/.test(html)) {
    fail(
      "sample HTML has no escaped angle brackets — generics may be leaking as raw HTML",
    );
  }
  // The written heading ids must match the golden exactly.
  const emittedIds = [
    ...html.matchAll(
      /<h[1-6][^>]* id="([^"]+)"/g,
    ),
  ].map((m) => m[1]);
  const goldenAtomics = golden.pages.find(
    (p) => p.route === atomicsRoute,
  );
  const emittedIdSet = new Set(emittedIds);
  const goldenIdSet = new Set(
    goldenAtomics.headingIds,
  );
  const idMissing =
    goldenAtomics.headingIds.filter(
      (id) => !emittedIdSet.has(id),
    );
  const idExtra = emittedIds.filter(
    (id) => !goldenIdSet.has(id),
  );
  if (
    idMissing.length > 0 ||
    idExtra.length > 0
  ) {
    fail(
      `sample HTML heading ids drifted (missing: ${idMissing.join(", ")}; extra: ${idExtra.join(", ")})`,
    );
  }
  console.log(
    `  ok emitted HTML — 0 <script>, 404.html present, ${emittedIds.length} heading ids match golden, generics escaped, ${report.pages.length} file(s) written`,
  );

  // ── Step 5: authored-anchor-fix guard ──────────────────
  // The four authored cross-page `#fragment` links fixed in
  // this change (plus the one that already resolved) must
  // resolve against their TARGET page's emitted slugs.
  const targets = await renderPages(guideRoot, [
    "/packages/plgg-view",
    "/packages/plgg/values-effects",
    "/packages/plgg/structures-errors",
  ]);
  const anchorExpectations = [
    [
      "/packages/plgg-view",
      "the-view-tree-—-html-msg-t",
    ],
    [
      "/packages/plgg-view",
      "ssr-—-rendertostring",
    ],
    [
      "/packages/plgg/values-effects",
      "effects-—-compose-don-t-enumerate",
    ],
    [
      "/packages/plgg/values-effects",
      "prefer-str-for-strings",
    ],
    [
      "/packages/plgg/structures-errors",
      "the-error-model-—-errors-as-data",
    ],
  ];
  for (const [
    route,
    slug,
  ] of anchorExpectations) {
    const target = targets.get(route);
    if (
      !target ||
      !new Set(target.slugs).has(slug)
    ) {
      fail(
        `authored-anchor target #${slug} does not resolve on ${route}`,
      );
    }
  }
  console.log(
    `  ok authored anchors — ${anchorExpectations.length} cross-page #fragment target(s) resolve`,
  );

  // ── Step 6: negative drift check ───────────────────────
  // Drift a heading on the stable sample; the anchor-
  // reproduction assertion MUST then fail.
  const driftDir = join(tmp, "drift");
  cpSync(
    join(guideRoot, "api", "plgg", "atomics.md"),
    join(driftDir, "atomics.md"),
    { recursive: true },
  );
  const driftFile = join(driftDir, "atomics.md");
  const original = readFileSync(
    driftFile,
    "utf8",
  );
  const drifted = original.replace(
    /^## BigInt$/m,
    "## BigIntDrifted",
  );
  // Guard the guard: if the heading text ever changes, the
  // negative check must not silently no-op.
  if (drifted === original) {
    fail(
      "negative check could not drift the sample — `## BigInt` heading no longer present",
    );
  }
  writeFileSync(driftFile, drifted);
  const driftPages = await renderPages(driftDir, [
    "/atomics",
  ]);
  const driftSlugs = new Set(
    driftPages.get("/atomics").slugs,
  );
  const stillReproduced =
    goldenAtomics.headingIds.every((id) =>
      driftSlugs.has(id),
    );
  if (stillReproduced) {
    fail(
      "negative check did not fail — a drifted heading should break anchor reproduction",
    );
  }
  console.log(
    "  ok negative check — drifted heading correctly breaks anchor parity",
  );
} finally {
  rmSync(tmp, {
    recursive: true,
    force: true,
  });
}

console.log(
  "verify:render PASSED — sampled API pages render through plgg-press with golden parity (anchors, link forms, zero client JS).",
);
