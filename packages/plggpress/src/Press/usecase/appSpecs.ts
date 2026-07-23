import {
  type SoftStr,
  type Option,
  type Defect,
  type Result,
  type PromisedResult,
  some,
  none,
  ok,
  err,
  pipe,
  chainResult,
  matchResult,
  matchOption,
} from "plgg";
import { matchesAnyGlob } from "plggpress/Glob/usecase/matchGlob";
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
import { type ContentModelBinding } from "plggpress/ContentModel/model/ContentModel";
import { type ModelViolations } from "plggpress/ContentModel/model/ModelViolation";
import {
  type Page,
  checkModels,
} from "plggpress/ContentModel/usecase/checkModels";
import { collectPages } from "plggpress/ContentModel/usecase/collectPages";
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
/**
 * The build-time content-model check (D8): validates every
 * page under a bound directory against its model, when the
 * config declares any (`None` ⇒ skip, so existing configs
 * are unaffected). Runs after the link check, folding into
 * the same build error channel.
 */
const modelCheckOf =
  (config: SiteConfig, contentDir: SoftStr) =>
  (
    paths: ReadonlyArray<SoftStr>,
  ): PromisedResult<
    null,
    Defect | ModelViolations
  > =>
    matchOption<
      ReadonlyArray<ContentModelBinding>,
      PromisedResult<
        null,
        Defect | ModelViolations
      >
    >(
      () => Promise.resolve(ok(null)),
      (
        bindings: ReadonlyArray<ContentModelBinding>,
      ) =>
        collectPages(contentDir)(paths).then(
          matchResult<
            ReadonlyArray<Page>,
            Defect,
            Result<null, Defect | ModelViolations>
          >(
            (e: Defect) => err(e),
            (pages: ReadonlyArray<Page>) =>
              checkModels(pages, bindings),
          ),
        ),
    )(config.models);

export const buildSpecOf = (
  config: SiteConfig,
  contentDir: SoftStr,
  base: SoftStr,
): BuildSpec<
  Defect | BrokenLinks | ModelViolations
> => ({
  router: (paths: ReadonlyArray<SoftStr>): Web =>
    pressRouter(contentDir, config, base, paths),
  notFoundHtml: injectAppearanceScripts(
    renderToString(notFound(config)),
  ),
  excludePath: pipe(
    config.srcExclude,
    matchOption(
      (): Option<
        (path: SoftStr) => boolean
      > => none(),
      (
        patterns: ReadonlyArray<SoftStr>,
      ): Option<(path: SoftStr) => boolean> =>
        some(matchesAnyGlob(patterns)),
    ),
  ),
  linkCheck: some(
    (
      paths: ReadonlyArray<SoftStr>,
    ): PromisedResult<
      unknown,
      Defect | BrokenLinks | ModelViolations
    > =>
      collectPageLinks(
        contentDir,
        base,
        config,
      )(paths)
        .then(
          chainResult(
            (
              pages: ReadonlyArray<PageLinks>,
            ): Result<
              void,
              Defect | BrokenLinks
            > =>
              checkLinks(
                base,
                pipe(
                  config.linkIgnore,
                  matchOption(
                    (): ((
                      href: SoftStr,
                    ) => boolean) =>
                      (
                        _href: SoftStr,
                      ): boolean => false,
                    (
                      patterns: ReadonlyArray<SoftStr>,
                    ): ((
                      href: SoftStr,
                    ) => boolean) =>
                      matchesAnyGlob(patterns),
                  ),
                ),
              )(pages),
          ),
        )
        .then(
          matchResult<
            void,
            Defect | BrokenLinks,
            PromisedResult<
              unknown,
              | Defect
              | BrokenLinks
              | ModelViolations
            >
          >(
            (e: Defect | BrokenLinks) =>
              Promise.resolve(err(e)),
            () =>
              modelCheckOf(
                config,
                contentDir,
              )(paths),
          ),
        ),
  ),
});
