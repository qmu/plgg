import {
  type SoftStr,
  type Box,
  type Result,
  box,
  pattern,
} from "plgg";
import { type Row } from "plggmatic/Declare/model/Row";

/**
 * The ancestor selections a source reads against, root→
 * parent — so a child collection (notes) filters by its
 * parent selection (a section id) WITHOUT the model
 * storing the parent object. Empty at the root.
 */
export type Path = ReadonlyArray<SoftStr>;

/**
 * A typed data-access seam over items `T`, sync OR async
 * through ONE shape (design tenet e): `Sync` is an
 * in-memory read, `Async` a deferred (`proc`/Promise-
 * folded-to-`Result`) read the scheduler runs as a `Cmd`.
 * Swapping `Sync` for `Async` never rewrites the app.
 */
export type TypedSource<T> =
  | Box<"Sync", (path: Path) => ReadonlyArray<T>>
  | Box<
      "Async",
      (
        path: Path,
      ) => Promise<Result<ReadonlyArray<T>, Error>>
    >;

/**
 * The erased, `Row`-valued source the scheduler consumes
 * (a {@link TypedSource} with its items already projected
 * through the collection's `toRow`). Same two variants,
 * so the sync/async symmetry survives erasure.
 */
export type Source =
  | Box<
      "Sync",
      (path: Path) => ReadonlyArray<Row>
    >
  | Box<
      "Async",
      (
        path: Path,
      ) => Promise<Result<ReadonlyArray<Row>, Error>>
    >;

/** A synchronous typed source. */
export const sync = <T>(
  read: (path: Path) => ReadonlyArray<T>,
): TypedSource<T> => box("Sync")(read);

/** A deferred typed source (folded to a `Cmd`). */
export const async = <T>(
  read: (
    path: Path,
  ) => Promise<Result<ReadonlyArray<T>, Error>>,
): TypedSource<T> => box("Async")(read);

/** Matchers for folding a {@link Source}. */
export const sync$ = () => pattern("Sync")();
export const async$ = () => pattern("Async")();
