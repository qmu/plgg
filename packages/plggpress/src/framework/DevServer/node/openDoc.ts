import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import {
  type SoftStr,
  type Option,
  some,
  none,
  isSome,
} from "plgg";
import {
  type OpenDoc,
  type OpenDocReader,
} from "plggpress/framework/DevServer/usecase/voiceDoc";
import { candidateFiles } from "plggpress/router/pressRouter";

// The fs half of "on the same page": turn the route the
// browser is on into the markdown behind it, through the
// render path's OWN inverse (`candidateFiles`) — the same
// `foo.md` / `foo/index.md` collapse `discoverPaths` applies —
// so the assistant reads exactly the file the page was
// rendered from.

/**
 * Read the first candidate source file that exists for a
 * route, as the content-root-relative path plus its text.
 * `None` when the route has no readable document — an
 * ungrounded session is a supported outcome, not an error.
 *
 * The candidates are tried in order (a plain `.md` before an
 * `index.md`), which is exactly the render path's precedence.
 */
export const openDocReader =
  (contentDir: SoftStr): OpenDocReader =>
  async (
    routePath: SoftStr,
  ): Promise<Option<OpenDoc>> => {
    // A short candidate list read in precedence order: an
    // await inside the loop is the point (stop at the first
    // file that exists), so this is an honest sequential seam
    // rather than a fold that would read every candidate.
    for (const file of candidateFiles(
      contentDir,
      routePath,
    )) {
      const text = await readFile(
        file,
        "utf8",
      ).then(
        (source: SoftStr): Option<SoftStr> =>
          some(source),
        (): Option<SoftStr> => none(),
      );
      if (isSome(text)) {
        return some({
          path: relative(contentDir, file),
          text: text.content,
        });
      }
    }
    return none();
  };
