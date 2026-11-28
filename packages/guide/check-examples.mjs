// Check the actual published fences. A filename heading identifies a module
// that other examples can import (the bookshelf tutorial and its recipes).
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

const root = import.meta.dirname;
const bin = join(root, "../../node_modules/.bin");
const compilerOptions = {
  strict: true,
  noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: true,
  noImplicitReturns: true,
  allowJs: true,
  checkJs: true,
  noEmit: true,
  module: "ESNext",
  moduleResolution: "Bundler",
  target: "ES2023",
  allowImportingTsExtensions: true,
  types: ["node"],
  skipLibCheck: true,
};

function manuscripts(dir) {
  return readdirSync(dir, {
    withFileTypes: true,
  }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return manuscripts(path);
    return entry.name.endsWith(".md")
      ? [path]
      : [];
  });
}

function extract(site, scratch) {
  const names = [];
  for (const path of manuscripts(site)) {
    const source = readFileSync(path, "utf8");
    const fences =
      /^```(ts|js)\n([\s\S]*?)^```$/gm;
    for (const match of source.matchAll(fences)) {
      const [, lang, code] = match;
      const prefix = source
        .slice(0, match.index)
        .trimEnd()
        .split("\n")
        .at(-1);
      const filename = prefix?.match(
        /^### `([\w-]+\.ts)`$/,
      )?.[1];
      const page = relative(
        site,
        path,
      ).replaceAll("/", "-");
      const line = source
        .slice(0, match.index)
        .split("\n").length;
      const ext = code.includes(
        'from "plgg-test"',
      )
        ? "spec.ts"
        : lang;
      const name =
        filename ?? `${page}-${line}.${ext}`;
      writeFileSync(join(scratch, name), code, {
        flag: "wx",
      });
      names.push(name);
    }
  }
  return names;
}

for (const locale of ["ja", "en"]) {
  const scratch = mkdtempSync(
    join(root, ".examples-"),
  );
  const run = (command, args) =>
    execFileSync(command, args, {
      cwd: scratch,
      stdio: "inherit",
    });
  try {
    const names = extract(
      join(root, "site", locale),
      scratch,
    );
    writeFileSync(
      join(scratch, "tsconfig.json"),
      JSON.stringify({
        compilerOptions,
        files: names,
      }),
    );
    run(join(bin, "tsc"), ["-p", "."]);
    for (const name of names) {
      if (!name.endsWith(".spec.ts"))
        run(process.execPath, [name, "Atlas"]);
    }
    if (
      names.some((name) =>
        name.endsWith(".spec.ts"),
      )
    )
      run(join(bin, "plgg-test"), ["."]);
    console.log(
      `${locale} verified ${names.length} examples`,
    );
  } finally {
    rmSync(scratch, {
      recursive: true,
      force: true,
    });
  }
}
