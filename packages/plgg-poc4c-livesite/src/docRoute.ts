/**
 * The plggpress route a corpus file renders at, under the
 * shell's /docs/ proxy — the inverse the iframe needs of
 * plggpress's `candidateFiles` mapping. Carried over from
 * PoC 4 (4b had no iframe, so it had no need of it): the
 * shell must turn "the open document is guide/index.md"
 * into "the real page at /docs/".
 */
import { type SoftStr, pipe } from "plgg";

export const routeOf = (file: SoftStr): SoftStr =>
  pipe(
    file.endsWith("/index.md")
      ? file.slice(0, -"/index.md".length)
      : file === "index.md"
        ? ""
        : file.endsWith(".md")
          ? file.slice(0, -".md".length)
          : file,
    (path: SoftStr): SoftStr => `/docs/${path}`,
  );
