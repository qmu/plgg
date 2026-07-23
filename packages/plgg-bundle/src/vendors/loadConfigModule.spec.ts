import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importConfigModule } from "plgg-bundle/vendors/loadConfigModule";

// A bundle.config.ts using `import.meta.dirname` for
// `root` — the surface every real config relies on, and
// the reason the transpiled sibling must land in the
// config's OWN directory.
const CONFIG_BODY = [
  "export default {",
  "  root: import.meta.dirname,",
  '  rootDir: "src",',
  '  outDir: "dist",',
  '  entries: [{ name: "index", input: "index.ts" }],',
  '  formats: ["es"],',
  '  fileNamePattern: "[name].js",',
  '  alias: { prefix: "fixture", srcRoot: "src" },',
  "};",
  "",
].join("\n");

/**
 * A throwaway package dir with a TYPELESS package.json
 * (no `"type"` field — the exact condition that trips
 * MODULE_TYPELESS_PACKAGE_JSON when a `.ts` is imported
 * from it) plus a bundle.config.ts. Caller removes it.
 */
const makeConfigPkg = (): string => {
  const root = mkdtempSync(
    join(tmpdir(), "plgg-bundle-loadcfg-"),
  );
  writeFileSync(
    join(root, "package.json"),
    '{ "name": "fixture" }\n',
  );
  writeFileSync(
    join(root, "bundle.config.ts"),
    CONFIG_BODY,
  );
  return root;
};

/** The module's `default` export, or the module itself. */
const pickDefault = (mod: unknown): unknown =>
  typeof mod === "object" &&
  mod !== null &&
  "default" in mod
    ? mod.default
    : mod;

/** The `root` string of a config object, or null. */
const rootOf = (def: unknown): string | null =>
  typeof def === "object" &&
  def !== null &&
  "root" in def &&
  typeof def.root === "string"
    ? def.root
    : null;

test("importConfigModule loads a typeless-package config and resolves import.meta.dirname to the package dir", async () => {
  const root = makeConfigPkg();
  try {
    const mod = await importConfigModule(
      join(root, "bundle.config.ts"),
    );
    return all([
      // The default export loaded, and its
      // `import.meta.dirname` points at the config's own
      // directory (not a temp dir) — the sibling-.mjs
      // location preserves it.
      check(
        rootOf(pickDefault(mod)) === root,
        toBe(true),
      ),
      // No transpiled sibling is left behind.
      check(
        readdirSync(root).some((f) =>
          f.startsWith(".bundle.config."),
        ),
        toBe(false),
      ),
    ]);
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

test("importConfigModule emits no MODULE_TYPELESS_PACKAGE_JSON warning", async () => {
  const root = makeConfigPkg();
  const warnings: string[] = [];
  const onWarn = (w: Error): void => {
    warnings.push(`${w.name}: ${w.message}`);
  };
  process.on("warning", onWarn);
  try {
    await importConfigModule(
      join(root, "bundle.config.ts"),
    );
    // process.emitWarning flushes asynchronously; let the
    // queue drain before asserting none fired.
    await new Promise((r) => setTimeout(r, 20));
    return check(
      warnings.some((w) =>
        w.includes("MODULE_TYPELESS_PACKAGE_JSON"),
      ),
      toBe(false),
    );
  } finally {
    process.off("warning", onWarn);
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
