import { readFile } from "node:fs/promises";
import {
  type SoftStr,
  type PromisedResult,
  type Result,
  type Defect,
  ok,
  err,
  defect,
  isOk,
  matchResult,
  mapResult,
} from "plgg";
import { candidateFiles } from "plggpress/router/pressRouter";
import { type Page } from "plggpress/ContentModel/usecase/checkModels";

/**
 * Reads a route's backing source (the first existing
 * candidate file) — the node:fs half of the build-time
 * model check, mirroring `collectPageLinks`'s reader. A
 * total miss folds to a {@link Defect} (a discovered route
 * always has a file), never an escaped throw.
 */
const readSource = (
  contentDir: SoftStr,
  route: SoftStr,
): PromisedResult<SoftStr, Defect> =>
  candidateFiles(contentDir, route).reduce(
    (
      acc: PromisedResult<SoftStr, Defect>,
      file: SoftStr,
    ): PromisedResult<SoftStr, Defect> =>
      acc.then(
        (
          soFar: Result<SoftStr, Defect>,
        ): PromisedResult<SoftStr, Defect> =>
          isOk(soFar)
            ? Promise.resolve(soFar)
            : readFile(file, "utf8").then(
                (src: SoftStr): Result<SoftStr, Defect> =>
                  ok(src),
                (): Result<SoftStr, Defect> =>
                  soFar,
              ),
      ),
    Promise.resolve(
      err<Defect>(
        defect(
          `no readable source for route ${route}`,
        ),
      ),
    ),
  );

/**
 * Collects `{ path, source }` for every discovered route —
 * the input the {@link checkModels} build pass validates.
 */
export const collectPages =
  (contentDir: SoftStr) =>
  (
    paths: ReadonlyArray<SoftStr>,
  ): PromisedResult<
    ReadonlyArray<Page>,
    Defect
  > =>
    paths.reduce<
      PromisedResult<
        ReadonlyArray<Page>,
        Defect
      >
    >(
      (acc, route: SoftStr) =>
        acc.then(
          matchResult<
            ReadonlyArray<Page>,
            Defect,
            PromisedResult<
              ReadonlyArray<Page>,
              Defect
            >
          >(
            (e: Defect) =>
              Promise.resolve(err(e)),
            (pages: ReadonlyArray<Page>) =>
              readSource(contentDir, route).then(
                mapResult(
                  (
                    source: SoftStr,
                  ): ReadonlyArray<Page> => [
                    ...pages,
                    { path: route, source },
                  ],
                ),
              ),
          ),
        ),
      Promise.resolve(ok([])),
    );
