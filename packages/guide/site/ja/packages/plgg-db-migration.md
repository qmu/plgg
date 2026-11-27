# plgg-db-migration — スキーマの変更を適用する

`migrate.config.ts` で `db`、`dialect`、`migrationsDir` を指定します。`npx plgg-db-migration new add_books` で SQL ファイルを作り、`-- migrate:up` に適用時、`-- migrate:down` に取り消し時の SQL を書きます。

`status` で未適用の変更を確認してから `up` で適用します。適用した版は `schema_migrations` に記録されます。SQLite には付属のアダプターを使えます。
