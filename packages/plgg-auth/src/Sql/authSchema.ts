import {
  type SoftStr,
  type PromisedResult,
  type Defect,
  proc,
  ok,
} from "plgg";
import {
  type Db,
  type SqlError,
  runScript,
} from "plgg-sql";

/**
 * The OIDC provider's SQLite schema as an idempotent DDL
 * script — a packaged, in-process-consumable mirror of the
 * `databases/auth/migrations` up-migration (that migrations
 * dir is NOT in `files`, so a consumer of the dist — e.g. a
 * dogfooded plggpress serving both OP and RP in one process —
 * cannot read it). Keep in sync with the migration; the
 * migration remains the source of truth for real, versioned
 * provisioning, this is the ephemeral / single-process path.
 * `IF NOT EXISTS` so a fresh or existing DB is safe.
 */
export const AUTH_SCHEMA_DDL: SoftStr = `
CREATE TABLE IF NOT EXISTS oidc_clients (
  id TEXT PRIMARY KEY,
  secret_hash TEXT
);
CREATE TABLE IF NOT EXISTS oidc_client_redirect_uris (
  client_id TEXT NOT NULL REFERENCES oidc_clients(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  PRIMARY KEY (client_id, redirect_uri)
);
CREATE TABLE IF NOT EXISTS oidc_pending_requests (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS oidc_sessions (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS oidc_authorization_codes (
  code TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  subject TEXT NOT NULL,
  scopes TEXT NOT NULL,
  nonce TEXT,
  code_challenge TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS oidc_access_grants (
  token TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  client_id TEXT NOT NULL,
  scopes TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS oidc_refresh_tokens (
  token_hash TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  scopes TEXT NOT NULL,
  rotated_from TEXT,
  status TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS oidc_refresh_tokens_family ON oidc_refresh_tokens(family_id);
CREATE TABLE IF NOT EXISTS oidc_signing_keys (
  kid TEXT PRIMARY KEY,
  private_jwk TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS oidc_signing_keys_status ON oidc_signing_keys(status);`.trim();

/**
 * Applies {@link AUTH_SCHEMA_DDL} to `db` — the one call a
 * same-process OP boot needs before {@link sqlStore} is
 * usable. Idempotent; never throws.
 */
export const applyAuthSchema = (
  db: Db,
): PromisedResult<null, SqlError | Defect> =>
  proc(runScript(db)(AUTH_SCHEMA_DDL), () =>
    ok(null),
  );
