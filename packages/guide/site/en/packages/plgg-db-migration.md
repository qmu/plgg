# plgg-db-migration — Apply schema changes

Set `db`, `dialect`, and `migrationsDir` in `migrate.config.ts`. Run `npx plgg-db-migration new add_books` to create a SQL file. Put the forward change under `-- migrate:up` and its reversal under `-- migrate:down`.

Check pending changes with `status`, then apply them with `up`. The engine records applied versions in `schema_migrations`. A SQLite adapter is included.
