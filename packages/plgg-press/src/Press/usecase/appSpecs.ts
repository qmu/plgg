import {
  type SoftStr,
  type Defect,
  type Result,
  type PromisedResult,
  some,
  chainResult,
} from "plgg";
import { renderToString } from "plgg-view";
import { type Web } from "plgg-server";
import { type BuildSpec } from "plggmatic";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import {
  type PageLinks,
  type BrokenLinks,
} from "plgg-press/CheckLinks/model/CheckLinks";
import { collectPageLinks } from "plgg-press/CheckLinks/usecase/collectPageLinks";
import { checkLinks } from "plgg-press/CheckLinks/usecase/checkLinks";
import { pressRouter } from "plgg-press/router/pressRouter";
import { notFound } from "plgg-press/theme/notFound";
import { injectThemeScripts } from "plgg-press/theme/themeScript";

/**
 * The press build declaration, stated once for every
 * entry point (`build`, the CLI): what plgg-press — the
 * docs app — supplies to `plggmatic`'s static build. The
 * router factory closes the validated config over
 * {@link pressRouter} (Markdown → highlight → theme), the
 * 404 body is the rendered theme {@link notFound} page,
 * and the link check is the press
 * {@link collectPageLinks} → {@link checkLinks} policy —
 * a broken internal link or `#anchor` fails the build
 * before anything is written.
 */
export const buildSpecOf = (
  config: SiteConfig,
  contentDir: SoftStr,
  base: SoftStr,
): BuildSpec<Defect | BrokenLinks> => ({
  router: (paths: ReadonlyArray<SoftStr>): Web =>
    pressRouter(contentDir, config, base, paths),
  notFoundHtml: injectThemeScripts(
    renderToString(notFound(config)),
  ),
  linkCheck: some(
    (
      paths: ReadonlyArray<SoftStr>,
    ): PromisedResult<
      unknown,
      Defect | BrokenLinks
    > =>
      collectPageLinks(
        contentDir,
        base,
      )(paths).then(
        chainResult(
          (
            pages: ReadonlyArray<PageLinks>,
          ): Result<void, Defect | BrokenLinks> =>
            checkLinks(base)(pages),
        ),
      ),
  ),
});
