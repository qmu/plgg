# Stories

Branch stories documenting the development journey, decisions, and outcomes.

- [drive-20260226-032733.md](drive-20260226-032733.md) - Documentation overhaul, dependency maintenance, README rewrite, and version bump to 0.0.26
- [work-20260513-182057.md](work-20260513-182057.md) - `match` type-completeness fixes plus five plgg-web mechanisms: 401/403 errors, Result.mapErr + JSON codec, compiled route table, binary/streaming bodies, scoped group middleware
- [plgg-sql.md](plgg-sql.md) - New plgg-sql POC: database work as pipeline steps (sql/query/exec/transaction/decodeRows) composable with plgg-web handlers via `proc`, proven end-to-end over HTTP on node:sqlite
