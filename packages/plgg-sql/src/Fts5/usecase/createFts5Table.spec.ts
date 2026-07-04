import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { none, some, isOk } from "plgg";
import { asSqlIdent } from "plgg-sql/Sql/model/SqlIdent";
import {
  fts5Table,
  fts5Column,
  normalContent,
  contentlessContent,
  externalContent,
  createFts5Table,
  Fts5Table,
} from "plgg-sql/index";

const id = (s: string) => {
  const r = asSqlIdent(s);
  if (!isOk(r)) {
    throw new Error(`test ident invalid: ${s}`);
  }
  return r.content;
};

const build = (
  spec: Parameters<typeof fts5Table>[0],
): Fts5Table => {
  const r = fts5Table(spec);
  if (!isOk(r)) {
    throw new Error("test table invalid");
  }
  return r.content;
};

test("renders a NORMAL fts5 table with zero params", () => {
  const ddl = createFts5Table(
    build({
      name: id("docs"),
      columns: [fts5Column(id("body"))],
      content: normalContent(),
      tokenizer: none(),
    }),
  );
  return all([
    check(
      ddl.content.text,
      toBe("CREATE VIRTUAL TABLE docs USING fts5(body)"),
    ),
    // pure DDL — nothing bound
    check(ddl.content.params.length, toBe(0)),
  ]);
});

test("renders UNINDEXED columns, contentless mode, and a tokenizer", () =>
  check(
    createFts5Table(
      build({
        name: id("docs"),
        columns: [
          fts5Column(id("body")),
          fts5Column(id("url"), true),
        ],
        content: contentlessContent(),
        tokenizer: some("trigram"),
      }),
    ).content.text,
    toBe(
      "CREATE VIRTUAL TABLE docs USING fts5(body, url UNINDEXED, content='', tokenize = 'trigram')",
    ),
  ));

test("renders external-content mode naming the source table and rowid", () =>
  check(
    createFts5Table(
      build({
        name: id("fts"),
        columns: [
          fts5Column(id("title")),
          fts5Column(id("body")),
        ],
        content: externalContent(id("src"), id("id")),
        tokenizer: none(),
      }),
    ).content.text,
    toBe(
      "CREATE VIRTUAL TABLE fts USING fts5(title, body, content='src', content_rowid='id')",
    ),
  ));

test("rendering is deterministic (same spec, same text)", () => {
  const spec = build({
    name: id("docs"),
    columns: [fts5Column(id("body"))],
    content: normalContent(),
    tokenizer: some("porter"),
  });
  return check(
    createFts5Table(spec).content.text,
    toBe(createFts5Table(spec).content.text),
  );
});
