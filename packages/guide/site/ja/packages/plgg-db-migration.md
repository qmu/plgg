# plgg-db-migration — スキーマの変更を適用する

`migrate.config.ts` で `db`、`dialect`、`migrationsDir` を指定します。`npx plgg-db-migration new add_books` で SQL ファイルを作り、`-- migrate:up` に適用時、`-- migrate:down` に取り消し時の SQL を書きます。

`status` で未適用の変更を確認してから `up` で適用します。適用した版は `schema_migrations` に記録されます。

## 使い方と制約

`parseMigration(text) → Result<ParsedMigration, MigrationError>`

up の印より前に SQL があると解析エラーになります。未実行の SQL を適用済みとして記録する事故を防ぐためです。down を省くと逆方向の SQL は `None` になります。dialect は DDL の扱いを選ぶ値で、DB 接続は利用側が用意します。

```ts
import { parseMigration } from "plgg-db-migration";

const up =
  "-- migrate:up\nCREATE TABLE books(title TEXT);";
console.log(parseMigration(up));
console.log(
  parseMigration("SELECT 1;\n" + up).__tag,
);
```

## 適用前の差分を読む

`planMigrations`(dir, applied) はファイルに記録した版と DB の適用済み一覧を比較して Plan を返します。この段階では SQL を実行しません。巻き戻しでは、版を指定しなければ直近の一件、指定すれば指定版より新しいものを新しい順に処理します。既に適用したファイルがディレクトリから消えている場合は失敗します。
