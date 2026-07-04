import { SoftStr } from "plgg";

/** The account-domain table names (never interpolated as SQL params). */
export const ACCOUNT_TABLES = {
  accounts: "accounts",
  roles: "account_roles",
  invites: "account_invites",
};

/**
 * The developer-authored DDL for the account domain, applied via
 * `db.execScript` (never carries user input). Timestamps are `INTEGER` (epoch
 * seconds); `username` is `UNIQUE` (normalized before write); password hashes
 * and invite token hashes are the only credential material at rest — both are
 * hashes, never plaintext. Reusable verbatim as a `plgg-db-migration` body.
 */
export const ACCOUNT_SCHEMA: SoftStr = `CREATE TABLE IF NOT EXISTS accounts (
  subject TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS account_roles (
  subject TEXT PRIMARY KEY,
  role TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS account_invites (
  token_hash TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);`;
