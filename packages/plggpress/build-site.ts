import { execFileSync } from "node:child_process";

for (const locale of ["ja", "en"]) {
  execFileSync(
    process.execPath,
    [
      "bin/plggpress.mjs",
      "build",
      "--config",
      "site/site.config.ts",
      "--contentDir",
      "site/" + locale,
      "--outDir",
      locale === "ja"
        ? "dist-site"
        : "dist-site/en",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        SITE_LOCALE: locale,
      },
    },
  );
}
