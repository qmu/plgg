import {
  SoftStr,
  Bool,
  Option,
  matchOption,
} from "plgg";
import { Version } from "plgg-db-migration/domain/model/Version";

/**
 * One parsed single-file migration: its {@link Version}, a human `name`, the
 * trusted `up` body, and an `Option` `down` body — `None` for an irreversible
 * migration (no `-- migrate:down` section), never an empty string. The
 * `*Transaction` flags carry dbmate's `transaction:false` directive (default
 * `true`); they express statements that cannot run inside a transaction even on
 * a transactional engine (e.g. Postgres `CREATE INDEX CONCURRENTLY`).
 */
export type Migration = Readonly<{
  version: Version;
  name: SoftStr;
  up: SoftStr;
  down: Option<SoftStr>;
  upTransaction: Bool;
  downTransaction: Bool;
}>;

/**
 * Constructs a {@link Migration} — the single named construction point, so a
 * migration is never assembled as an ad-hoc literal at a call site.
 */
export const migration = (
  fields: Migration,
): Migration => fields;

/**
 * Whether a migration can be rolled back (it has a `down` section).
 */
export const isReversible = (
  value: Migration,
): Bool =>
  matchOption(
    () => false,
    () => true,
  )(value.down);
