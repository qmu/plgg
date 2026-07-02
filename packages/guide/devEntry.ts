import { join } from "node:path";
import { pressDevEntry } from "plgg-press/devEntry";

// The guide's dev entry for `plgg-bundle dev`: bind
// plgg-press's render factory to the guide's own content
// root, `site.config.ts`, and deploy base. plgg-bundle
// re-imports this module on every watched edit — and
// because `plgg-press/*` resolves to plgg-press's SOURCE
// here (see bundle.config.ts `dev.sourceAliases`), a theme
// `.ts` edit re-evaluates and a content edit re-discovers,
// so both hot-reload in the browser with no restart.
export default pressDevEntry({
  contentDir: import.meta.dirname,
  configPath: join(
    import.meta.dirname,
    "site.config.ts",
  ),
  base: process.env.DOCS_BASE ?? "/",
});
