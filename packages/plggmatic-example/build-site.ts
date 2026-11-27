import {
  mkdirSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { pages } from "./src/catalog/pages.ts";
import { HOME } from "./src/catalog/address.ts";

// THE GUIDE AS A plggpress SITE. Every page of the catalog
// becomes one Markdown page holding one block — the page
// itself — so the catalog stays the only place a page is
// written. The pages are generated, built, and thrown
// away; nothing here is edited by hand.
const content = ".site-content";
const out = "dist-site";
rmSync(content, { recursive: true, force: true });
mkdirSync(content, { recursive: true });
for (const page of pages) {
  const file =
    page.id === HOME
      ? join(content, "index.md")
      : join(content, page.id + ".md");
  writeFileSync(
    file,
    [
      "# " + page.title,
      "",
      "```plggmatic-page",
      page.id,
      "```",
      "",
    ].join("\n"),
  );
}
execFileSync(
  "plggpress",
  [
    "build",
    "--config",
    "site/site.config.ts",
    "--parts",
    "site/site.parts.ts",
    "--contentDir",
    content,
    "--outDir",
    out,
  ],
  { stdio: "inherit" },
);
// the whole screens the guide shows in frames
for (const name of readdirSync("dist")) {
  if (
    /^(demo\d|forms|reference)\.(html|js)$/.test(
      name,
    )
  )
    copyFileSync(
      join("dist", name),
      join(out, name),
    );
}
rmSync(content, { recursive: true, force: true });
