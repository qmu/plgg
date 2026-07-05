import {
  type Result,
  ok,
  err,
  matchResult,
  matchOption,
  getOr,
  fromNullable,
  none,
} from "plgg";
import {
  type Declaration,
  type Path,
  declare,
  menu,
  menuEntry,
  collection,
  async,
  query,
  makeRow,
  field,
} from "plggmatic";
import {
  type Db,
  type Document,
  type CollectionSchema,
  type ListQuery,
  listCollections,
  listCollection,
} from "plgg-content";

/** The default document page (the admin list view's window). */
const DEFAULT_QUERY: ListQuery = {
  limit: 50,
  offset: 0,
  orderBy: "updated_at",
  orderDir: "desc",
  q: none(),
};

/**
 * The content-browsing half of the admin declaration (D1):
 * two Collections over ticket 16's HTTP-free query functions
 * as ASYNC sources — `listCollections` lists the registered
 * models, and selecting one drills into its `listCollection`
 * documents (the parent selection arrives as the source
 * `Path`). Read-only here (editing is ticket 22). A pure
 * declaration parameterised by the index `Db`; `schedule()`
 * derives the running program, and either renderer projects
 * it — so this is storage- AND mode-agnostic.
 */
export const adminDeclaration = (
  db: Db,
): Declaration =>
  declare({
    title: "plggpress admin",
    menu: menu([
      menuEntry("Content", "collections"),
    ]),
    collections: [
      collection<CollectionSchema>({
        id: "collections",
        title: "Collections",
        toRow: (c: CollectionSchema) =>
          makeRow(c.name, c.name),
        source: async(() =>
          listCollections(db).then(
            matchResult<
              ReadonlyArray<CollectionSchema>,
              { content: { message: string } },
              Result<
                ReadonlyArray<CollectionSchema>,
                Error
              >
            >(
              (e) =>
                err(
                  new Error(e.content.message),
                ),
              (cols) => ok(cols),
            ),
          ),
        ),
        child: "documents",
      }),
      collection<Document>({
        id: "documents",
        title: "Documents",
        toRow: (d: Document) =>
          makeRow(
            d.path,
            matchOption<string, string>(
              () => d.path,
              (t: string) => t,
            )(d.title),
            [field("path", d.path)],
          ),
        query: query("Search documents"),
        source: async((path: Path) =>
          listCollection(db)(
            getOr("")(fromNullable(path[0])),
            DEFAULT_QUERY,
          ).then(
            matchResult<
              {
                contents: ReadonlyArray<Document>;
              },
              { content: { message: string } },
              Result<
                ReadonlyArray<Document>,
                Error
              >
            >(
              (e) =>
                err(
                  new Error(e.content.message),
                ),
              (list) => ok(list.contents),
            ),
          ),
        ),
      }),
    ],
  });
