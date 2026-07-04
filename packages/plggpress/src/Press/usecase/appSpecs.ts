import {
  type SoftStr,
  type Defect,
  type Result,
  type PromisedResult,
  some,
  chainResult,
} from "plgg";
import { renderToString } from "plggpress/framework";
import { type Web } from "plggpress/framework";
import { type BuildSpec } from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import {
  type PageLinks,
  type BrokenLinks,
} from "plggpress/CheckLinks/model/CheckLinks";
import { collectPageLinks } from "plggpress/CheckLinks/usecase/collectPageLinks";
import { checkLinks } from "plggpress/CheckLinks/usecase/checkLinks";
import { pressRouter } from "plggpress/router/pressRouter";
import { notFound } from "plggpress/theme/notFound";
import { injectAppearanceScripts } from "plggpress/theme/appearanceScripts";

/**
 * The press build declaration, stated once for every
 * entry point (`build`, the CLI): what plggpress — the
 * docs app — supplies to the framework's static build. The
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
  notFoundHtml: injectAppearanceScripts(
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
