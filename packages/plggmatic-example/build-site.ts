import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { pagesFor } from "./src/catalog/pages.ts";
import { HOME } from "./src/catalog/address.ts";
import { type Locale } from "./src/catalog/locale.ts";

const out = "dist-site";
const build = (
  locale: Locale,
  destination: string,
) => {
  const content = mkdtempSync(".site-content-");
  try {
    for (const page of pagesFor(locale)) {
      const file =
        page.id === HOME ? "index" : page.id;
      writeFileSync(
        join(content, file + ".md"),
        [
          "# " + page.title,
          "",
          "```plggmatic-page",
          locale + "/" + page.id,
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
        destination,
      ],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          SITE_LOCALE: locale,
        },
      },
    );
  } finally {
    rmSync(content, {
      recursive: true,
      force: true,
    });
  }
};

build("ja", out);
build("en", join(out, "en"));
// Both editions frame the same standalone applications.
for (const name of [
  "demo1",
  "demo2",
  "demo3",
  "demo4",
  "forms",
  "reference",
]) {
  for (const file of [
    name + ".html",
    (name === "reference" ? "main" : name) +
      ".js",
  ]) {
    copyFileSync(
      join("dist", file),
      join(out, file),
    );
  }
}
