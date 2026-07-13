import { join } from "node:path";
import { pressDevEntry } from "plggpress/devEntry";

// PoC 4's INTERNAL doc server entry for
// `plgg-bundle dev`: plggpress's render factory bound to
// the seeded, agent-editable COPY of the guide corpus
// (content/ — git-ignored; `npm run reset-content`
// re-seeds it) and its copied site.config.ts. The base
// defaults to /docs/ because the shell server fronts this
// process behind a /docs/* proxy — every rendered href
// must carry that prefix to stay on the shell origin.
// DOCS_BASE keeps the seam overridable, mirroring the
// guide's own dev entry.
export default pressDevEntry({
  contentDir: join(
    import.meta.dirname,
    "content",
  ),
  configPath: join(
    import.meta.dirname,
    "content",
    "site.config.ts",
  ),
  base: process.env.DOCS_BASE ?? "/docs/",
});
