import {
  readdir,
  readFile,
  writeFile,
  mkdir,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  SoftStr,
  Result,
  PromisedResult,
  ok,
  err,
} from "plgg";
import {
  MigrationError,
  ioFailure,
} from "plgg-db-migration/domain/model/MigrationError";

/**
 * The filesystem anti-corruption layer: the only place the package touches
 * `node:fs`. Each operation folds a rejected `node:fs` promise into a value-level
 * `IoFailure` {@link MigrationError}, so the domain usecases stay pure and never
 * import `node:fs` directly.
 */

/** Join a directory and a filename (pure `node:path`, kept behind this seam). */
export const joinPath = (
  dir: SoftStr,
  file: SoftStr,
): SoftStr => join(dir, file);

/** List a directory's entries. */
export const listDir = (
  dir: SoftStr,
): PromisedResult<
  ReadonlyArray<SoftStr>,
  MigrationError
> =>
  readdir(dir).then(
    (
      entries,
    ): Result<
      ReadonlyArray<SoftStr>,
      MigrationError
    > => ok(entries),
    (cause: unknown) =>
      err(
        ioFailure(
          `could not read directory ${dir}`,
          cause,
        ),
      ),
  );

/** Read a file's text (UTF-8). */
export const readFileText = (
  path: SoftStr,
): PromisedResult<SoftStr, MigrationError> =>
  readFile(path, "utf8").then(
    (text): Result<SoftStr, MigrationError> =>
      ok(text),
    (cause: unknown) =>
      err(
        ioFailure(
          `could not read file ${path}`,
          cause,
        ),
      ),
  );

/** Write a file's text, creating parent directories as needed. */
export const writeFileText = (
  path: SoftStr,
  content: SoftStr,
): PromisedResult<SoftStr, MigrationError> =>
  mkdir(dirname(path), { recursive: true })
    .then(() => writeFile(path, content))
    .then(
      (): Result<SoftStr, MigrationError> =>
        ok(path),
      (cause: unknown) =>
        err(
          ioFailure(
            `could not write file ${path}`,
            cause,
          ),
        ),
    );
