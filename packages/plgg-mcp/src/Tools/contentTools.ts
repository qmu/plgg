import {
  type Option,
  type SoftStr,
  type PromisedResult,
  type Defect,
  ok,
  some,
  none,
  isErr,
  isSoftStr,
  isNum,
  getOr,
  matchResult,
  matchOption,
  asRawObj,
} from "plgg";
import {
  type Db,
  type Document,
  type SearchHit,
  type CollectionSchema,
  type Embedder,
  ragSearch,
  getDocument,
  listCollections,
} from "plgg-content";
import {
  type Tool,
  type ToolRegistry,
  type ToolResult,
  textResult,
  errorResult,
} from "plgg-mcp/Mcp/model/Tool";

/** Read a string argument from a raw tool-args object. */
const strArg = (
  args: unknown,
  key: string,
): Option<SoftStr> => {
  const obj = asRawObj<Record<string, unknown>>(args);
  if (isErr(obj)) {
    return none();
  }
  const v = obj.content[key];
  return isSoftStr(v) ? some(v) : none();
};

/** Read a bounded positive integer argument, defaulting to `fallback`. */
const numArg = (
  args: unknown,
  key: string,
  fallback: number,
): number => {
  const obj = asRawObj<Record<string, unknown>>(args);
  if (isErr(obj)) {
    return fallback;
  }
  const v = obj.content[key];
  return isNum(v) && v > 0 && v <= 50
    ? v
    : fallback;
};

/**
 * `search_content` — full-text + semantic search over the guide
 * corpus (ticket 24's {@link ragSearch}; degrades to FTS5 with
 * no key). Returns the matched document paths + heading
 * breadcrumbs as JSON. A missing `query` or a store error is a
 * tool-level `isError` result, never a thrown JSON-RPC error.
 */
export const searchContentTool = (
  db: Db,
  embedder: Option<Embedder>,
): Tool => ({
  name: "search_content",
  description:
    "Search the documentation corpus (semantic + full-text). Returns matching document paths and section headings.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      limit: { type: "number" },
    },
    required: ["query"],
  },
  call: (
    args,
  ): PromisedResult<ToolResult, Defect> =>
    matchOption<
      SoftStr,
      PromisedResult<ToolResult, Defect>
    >(
      () =>
        Promise.resolve(
          ok(
            errorResult(
              "search_content requires a 'query' string",
            ),
          ),
        ),
      (query: SoftStr) =>
        ragSearch(db, embedder)(
          query,
          numArg(args, "limit", 5),
        ).then(
          matchResult<
            ReadonlyArray<SearchHit>,
            { content: { message: string } },
            ToolResult
          >(
            (e) =>
              errorResult(e.content.message),
            (hits) =>
              textResult(
                JSON.stringify(
                  hits.map((h) => ({
                    path: h.document.path,
                    heading: h.headingPath,
                    rank: h.rank,
                  })),
                ),
              ),
          ),
        ).then(ok),
    )(strArg(args, "query")),
});

/**
 * `get_article` — fetch one document's typed frontmatter + body
 * by collection + path ({@link getDocument}). An absent document
 * is an `isError` result.
 */
export const getArticleTool = (
  db: Db,
): Tool => ({
  name: "get_article",
  description:
    "Fetch a single article by its collection and path, with typed frontmatter and body.",
  inputSchema: {
    type: "object",
    properties: {
      collection: { type: "string" },
      path: { type: "string" },
    },
    required: ["collection", "path"],
  },
  call: (
    args,
  ): PromisedResult<ToolResult, Defect> => {
    const collection = getOr("")(
      strArg(args, "collection"),
    );
    const path = getOr("")(strArg(args, "path"));
    return collection === "" || path === ""
      ? Promise.resolve(
          ok(
            errorResult(
              "get_article requires 'collection' and 'path'",
            ),
          ),
        )
      : getDocument(db)(collection, path)
          .then(
            matchResult<
              Option<Document>,
              { content: { message: string } },
              ToolResult
            >(
              (e) =>
                errorResult(e.content.message),
              (found) =>
                matchOption<Document, ToolResult>(
                  () =>
                    errorResult(
                      `no article at ${collection}/${path}`,
                    ),
                  (doc: Document) =>
                    textResult(
                      JSON.stringify(doc),
                    ),
                )(found),
            ),
          )
          .then(ok);
  },
});

/**
 * `list_collections` — the registered content collections + their
 * schemas ({@link listCollections}). No arguments.
 */
export const listCollectionsTool = (
  db: Db,
): Tool => ({
  name: "list_collections",
  description:
    "List the content collections and their field schemas.",
  inputSchema: { type: "object", properties: {} },
  call: (): PromisedResult<
    ToolResult,
    Defect
  > =>
    listCollections(db)
      .then(
        matchResult<
          ReadonlyArray<CollectionSchema>,
          { content: { message: string } },
          ToolResult
        >(
          (e) => errorResult(e.content.message),
          (cols) =>
            textResult(
              JSON.stringify(
                cols.map((c) => c.name),
              ),
            ),
        ),
      )
      .then(ok),
});

/** The read-only content tool registry for a served index. */
export const contentTools = (
  db: Db,
  embedder: Option<Embedder>,
): ToolRegistry => [
  searchContentTool(db, embedder),
  getArticleTool(db),
  listCollectionsTool(db),
];
