import {
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
const audits = [
  "wiring-audit.html",
  "layout-audit.html",
].flatMap((name) => {
  const path = join("dist", name);
  return existsSync(path)
    ? [{ path, bytes: readFileSync(path) }]
    : [];
});
try {
  execFileSync(
    "plggpress",
    [
      "build",
      "--config",
      "site.config.ts",
      "--contentDir",
      "markdown",
      "--outDir",
      "dist",
    ],
    { stdio: "inherit" },
  );
} finally {
  mkdirSync("dist", { recursive: true });
  for (const { path, bytes } of audits)
    writeFileSync(path, bytes);
}
for (const file of readdirSync("markdown", {
  recursive: true,
  encoding: "utf8",
})) {
  if (!file.endsWith(".md")) continue;
  const route =
    "/" +
    file
      .replace(/(?:^|\/)index\.md$/, "")
      .replace(/\.md$/, "/");
  const target = join(
    "dist/markdown",
    route,
    "index.html",
  );
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(
    target,
    `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${route}"><a href="${route}">${route}</a>`,
  );
}
