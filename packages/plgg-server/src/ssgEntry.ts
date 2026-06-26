// Renamed from `ssg.ts` to avoid a case collision with the `Ssg/`
// directory on case-insensitive filesystems (a lowercase `ssg.ts`
// beside `Ssg/` makes `tsc` fail with TS1149). The public
// `plgg-server/ssg` subpath is preserved via `package.json` `exports`
// (which point at `dist/ssgEntry.*`). Do NOT rename this back to
// `ssg.ts`.
import {
  PromisedResult,
  SoftStr,
  Defect,
  isOk,
} from "plgg";
import { Web } from "plgg-server/index";
import {
  SsgConfig,
  SsgError,
} from "plgg-server/Ssg/model/Ssg";
import { renderRoutes } from "plgg-server/Ssg/usecase/renderRoutes";
import { writeStatic } from "plgg-server/Ssg/usecase/writeStatic";

/**
 * Node-only SSG entry. The ONLY public surface that pulls in the
 * node:fs/node:path seam (`writeStatic`), so the runtime-neutral root
 * `index.ts` never gains a filesystem dependency — mirrors how `node.ts`
 * surfaces `serve`.
 */
export { writeStatic } from "plgg-server/Ssg/usecase/writeStatic";
export {
  ssgPage,
  renderFailed,
  nonOkStatus,
  nonHtmlBody,
  writeFailed,
  renderFailed$,
  nonOkStatus$,
  nonHtmlBody$,
  writeFailed$,
} from "plgg-server/Ssg/model/Ssg";
export type {
  SsgPage,
  SsgError,
  SsgConfig,
} from "plgg-server/Ssg/model/Ssg";

/**
 * The static-build driver: render every crawl path, then write the pages under
 * `outDir`, short-circuiting to the first error. A render failure never reaches
 * the fs seam. Yields the written file paths.
 */
export const generateStatic =
  (app: Web) =>
  async (
    config: SsgConfig,
  ): PromisedResult<
    ReadonlyArray<SoftStr>,
    SsgError | Defect
  > => {
    const rendered = await renderRoutes(app)(
      config.paths,
    );
    return isOk(rendered)
      ? writeStatic(config.outDir)(
          rendered.content,
        )
      : rendered;
  };
