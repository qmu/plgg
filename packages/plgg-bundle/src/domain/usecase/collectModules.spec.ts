import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectModules } from "plgg-bundle/domain/usecase/collectModules";
import {
  emitCjsBundle,
  emitEsmBundle,
} from "plgg-bundle/domain/usecase/emitBundle";

test("collectModules records external specifiers without walking them", () => {
  const root = mkdtempSync(
    join(tmpdir(), "plgg-bundle-collect-ext-"),
  );
  try {
    const entry = join(root, "src", "main.ts");
    mkdirSync(join(root, "src"), {
      recursive: true,
    });
    writeFileSync(
      entry,
      'import { readFileSync } from "node:fs";\nexport const read = readFileSync;\n',
    );
    const graph = collectModules({
      entryFile: entry,
      root,
      aliasPrefix: "app",
      aliasSrcRoot: join(root, "src"),
      external: /^node:/,
    });
    return all([
      check(graph.modules.length, toBe(1)),
      check(
        graph.modules[0]?.externals[0],
        toBe("node:fs"),
      ),
    ]);
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

test("collectModules throws on an unresolvable non-external specifier", () => {
  const root = mkdtempSync(
    join(
      tmpdir(),
      "plgg-bundle-collect-missing-",
    ),
  );
  try {
    const entry = join(root, "src", "main.ts");
    mkdirSync(join(root, "src"), {
      recursive: true,
    });
    writeFileSync(entry, 'import "missing";\n');
    return check(
      rejects(() =>
        collectModules({
          entryFile: entry,
          root,
          aliasPrefix: "app",
          aliasSrcRoot: join(root, "src"),
          external: /^node:/,
        }),
      ),
      toBe(true),
    );
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

test("collectModules ignores a require(\"${...}\") template-literal fragment", () => {
  // plgg-bundle's own `replaceRequire` builds the string
  // `require("${spec}")` as DATA; when the bundler bundles
  // itself (the cli target) that text must not be mistaken
  // for an import. A `${`-bearing capture is never a real
  // specifier, so it is dropped rather than resolved (which
  // would throw ResolveError on the bogus "${spec}").
  const root = mkdtempSync(
    join(tmpdir(), "plgg-bundle-collect-tmpl-"),
  );
  try {
    const entry = join(root, "src", "main.ts");
    mkdirSync(join(root, "src"), {
      recursive: true,
    });
    writeFileSync(
      entry,
      [
        'const spec = "x";',
        "export const s =",
        '  `require("${spec}")`;',
        "",
      ].join("\n"),
    );
    const graph = collectModules({
      entryFile: entry,
      root,
      aliasPrefix: "app",
      aliasSrcRoot: join(root, "src"),
      external: /^node:/,
    });
    return all([
      check(graph.modules.length, toBe(1)),
      check(
        graph.modules[0]?.externals.length,
        toBe(0),
      ),
    ]);
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

test("collectModules inlines an installed prebundled dist entry without resolving its internal registry requires", () => {
  const root = mkdtempSync(
    join(tmpdir(), "plgg-bundle-collect-"),
  );
  try {
    const entry = join(root, "src", "main.ts");
    const dep = join(
      root,
      "node_modules",
      "dep",
      "dist",
      "index.es.js",
    );
    const plgg = join(
      root,
      "node_modules",
      "plgg",
      "dist",
      "index.es.js",
    );
    mkdirSync(join(root, "src"), {
      recursive: true,
    });
    mkdirSync(
      join(root, "node_modules", "dep", "dist"),
      {
        recursive: true,
      },
    );
    mkdirSync(
      join(root, "node_modules", "plgg", "dist"),
      {
        recursive: true,
      },
    );
    writeFileSync(
      entry,
      'import dep from "dep";\nexport const value = dep.value;\n',
    );
    writeFileSync(
      dep,
      [
        'import * as __ext0 from "plgg";',
        'const __externals = { "plgg": __ext0 };',
        "const __modules = {",
        '"src/index.ts": function (module, exports, require) {',
        '  exports.value = require("src/internal.ts").value;',
        "},",
        '"src/internal.ts": function (module, exports, require) {',
        "  exports.value = __externals.plgg.external;",
        "}",
        "};",
        'const __entry = __modules["src/index.ts"];',
        "export default { value: __entry };",
      ].join("\n"),
    );
    writeFileSync(
      plgg,
      "export const external = 1;\n",
    );

    const graph = collectModules({
      entryFile: entry,
      root,
      aliasPrefix: "app",
      aliasSrcRoot: join(root, "src"),
      external: /^node:/,
      resolve: (specifier, _fromFile) =>
        specifier === "dep"
          ? dep
          : specifier === "plgg"
            ? plgg
            : undefined,
    });
    const depModule = graph.modules.find(
      (m) =>
        m.id ===
        "node_modules/dep/dist/index.es.js",
    );
    return all([
      check(graph.modules.length, toBe(3)),
      check(
        depModule?.code.includes(
          'require("src/internal.ts")',
        ),
        toBe(true),
      ),
      check(
        depModule?.code.includes(
          'require("node_modules/plgg/dist/index.es.js")',
        ),
        toBe(true),
      ),
    ]);
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

test("collectModules resolves node_modules source files without dist-registry filtering", () => {
  const root = mkdtempSync(
    join(tmpdir(), "plgg-bundle-collect-src-"),
  );
  try {
    const entry = join(root, "src", "main.ts");
    const dep = join(
      root,
      "node_modules",
      "dep",
      "src",
      "index.ts",
    );
    const internal = join(
      root,
      "node_modules",
      "dep",
      "src",
      "internal.ts",
    );
    writeImportFixture(entry, dep, internal);
    const graph = collectModules({
      entryFile: entry,
      root,
      aliasPrefix: "app",
      aliasSrcRoot: join(root, "src"),
      external: /^node:/,
      resolve: importFixtureResolver(
        dep,
        internal,
      ),
    });
    return check(graph.modules.length, toBe(3));
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

test("collectModules resolves non-js dist source files without dist-registry filtering", () => {
  const root = mkdtempSync(
    join(tmpdir(), "plgg-bundle-collect-mjs-"),
  );
  try {
    const entry = join(root, "src", "main.ts");
    const dep = join(
      root,
      "node_modules",
      "dep",
      "dist",
      "index.ts",
    );
    const internal = join(
      root,
      "node_modules",
      "dep",
      "dist",
      "internal.ts",
    );
    writeImportFixture(entry, dep, internal);
    const graph = collectModules({
      entryFile: entry,
      root,
      aliasPrefix: "app",
      aliasSrcRoot: join(root, "src"),
      external: /^node:/,
      resolve: importFixtureResolver(
        dep,
        internal,
      ),
    });
    return check(graph.modules.length, toBe(3));
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

test("an app bundling two dists with identical inner module paths keeps each dist's externals resolvable", () => {
  // Regression for the plggmatic blank-page defect:
  // pkg-a and pkg-b are plgg-bundle ESM dists whose
  // inner registries both key "src/index.ts", and
  // pkg-b requires pkg-a through its inner
  // __externals table. The outer rewrite must keep
  // that table's key in step with the rewritten
  // require, or pkg-b's inner lookup falls into the
  // async import fallback and yields a Promise where
  // a namespace is expected.
  const root = mkdtempSync(
    join(tmpdir(), "plgg-bundle-collect-nested-"),
  );
  try {
    const entry = join(root, "src", "main.ts");
    const pkgA = join(
      root,
      "node_modules",
      "pkg-a",
      "dist",
      "index.es.js",
    );
    const pkgB = join(
      root,
      "node_modules",
      "pkg-b",
      "dist",
      "index.es.js",
    );
    mkdirSync(join(root, "src"), {
      recursive: true,
    });
    mkdirSync(join(pkgA, ".."), {
      recursive: true,
    });
    mkdirSync(join(pkgB, ".."), {
      recursive: true,
    });
    writeFileSync(
      entry,
      [
        'import { box } from "pkg-a";',
        'import { useBox } from "pkg-b";',
        "export const direct = box(1);",
        "export const viaB = useBox();",
      ].join("\n"),
    );
    // Both dists come from the real emitter, so the
    // fixture cannot drift from the emitted shape.
    writeFileSync(
      pkgA,
      emitEsmBundle(
        {
          entryId: "src/index.ts",
          modules: [
            {
              id: "src/index.ts",
              code: "exports.box = (v) => v * 2;",
              externals: [],
            },
          ],
        },
        ["box"],
      ),
    );
    writeFileSync(
      pkgB,
      emitEsmBundle(
        {
          entryId: "src/index.ts",
          modules: [
            {
              id: "src/index.ts",
              code: 'exports.useBox = () => require("pkg-a").box(21);',
              externals: ["pkg-a"],
            },
          ],
        },
        ["useBox"],
      ),
    );
    const graph = collectModules({
      entryFile: entry,
      root,
      aliasPrefix: "app",
      aliasSrcRoot: join(root, "src"),
      external: /^node:/,
      resolve: (specifier, _fromFile) =>
        specifier === "pkg-a"
          ? pkgA
          : specifier === "pkg-b"
            ? pkgB
            : undefined,
    });
    const mod: {
      exports: Record<string, unknown>;
    } = {
      exports: {},
    };
    new Function(
      "module",
      "exports",
      "require",
      emitCjsBundle(graph),
    )(mod, mod.exports, () => ({}));
    return all([
      check(mod.exports.direct, toBe(2)),
      check(mod.exports.viaB, toBe(42)),
    ]);
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

const writeImportFixture = (
  entry: string,
  dep: string,
  internal: string,
): void => {
  mkdirSync(join(entry, ".."), {
    recursive: true,
  });
  mkdirSync(join(dep, ".."), { recursive: true });
  mkdirSync(join(internal, ".."), {
    recursive: true,
  });
  writeFileSync(
    entry,
    'import { value } from "dep";\nexport const out = value;\n',
  );
  writeFileSync(
    dep,
    'import { value } from "src/internal.ts";\nexport { value };\n',
  );
  writeFileSync(
    internal,
    "export const value = 1;\n",
  );
};

const importFixtureResolver =
  (
    dep: string,
    internal: string,
  ): ((
    specifier: string,
    fromFile: string,
  ) => string | undefined) =>
  (specifier, _fromFile) =>
    specifier === "dep"
      ? dep
      : specifier === "src/internal.ts"
        ? internal
        : undefined;

const rejects = (f: () => unknown): boolean => {
  try {
    f();
    return false;
  } catch (e) {
    return (
      e instanceof Error &&
      e.message.startsWith("ResolveError")
    );
  }
};
