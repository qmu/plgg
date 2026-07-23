-- migrate:up

-- Registered OAuth clients. The secret is stored only as a SHA-256 hash
-- (NULL for a public / PKCE-only client).
CREATE TABLE oidc_clients (
  id           TEXT PRIMARY KEY,
  secret_hash  TEXT
);

-- A client's registered redirect URIs (exact-match only). Referential
-- integrity: a URI cannot exist without its client.
CREATE TABLE oidc_client_redirect_uris (
  client_id     TEXT NOT NULL REFERENCES oidc_clients(id) ON DELETE CASCADE,
  redirect_uri  TEXT NOT NULL,
  PRIMARY KEY (client_id, redirect_uri)
);

-- Authorization requests parked while the end-user authenticates.
CREATE TABLE oidc_pending_requests (
  id           TEXT PRIMARY KEY,
  payload      TEXT NOT NULL,       -- JSON of the AuthorizationRequest
  expires_at   INTEGER NOT NULL
);

-- Authenticated OP sessions.
CREATE TABLE oidc_sessions (
  id           TEXT PRIMARY KEY,
  subject      TEXT NOT NULL,
  expires_at   INTEGER NOT NULL
);

-- Single-use authorization codes.
CREATE TABLE oidc_authorization_codes (
  code           TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  redirect_uri   TEXT NOT NULL,
  subject        TEXT NOT NULL,
  scopes         TEXT NOT NULL,     -- space-delimited
  nonce          TEXT,              -- NULL when absent
  code_challenge TEXT NOT NULL,
  expires_at     INTEGER NOT NULL
);

-- Live bearer access grants.
CREATE TABLE oidc_access_grants (
  token        TEXT PRIMARY KEY,
  subject      TEXT NOT NULL,
  client_id    TEXT NOT NULL,
  scopes       TEXT NOT NULL,
  expires_at   INTEGER NOT NULL
);

-- Refresh tokens: only the SHA-256 hash is stored, plus the rotation lineage
-- (family_id, rotated_from) and lifecycle status.
CREATE TABLE oidc_refresh_tokens (
  token_hash   TEXT PRIMARY KEY,
  family_id    TEXT NOT NULL,
  client_id    TEXT NOT NULL,
  subject      TEXT NOT NULL,
  scopes       TEXT NOT NULL,
  rotated_from TEXT,                -- prior token_hash, NULL for the family root
  status       TEXT NOT NULL,       -- active | rotated | revoked
  expires_at   INTEGER NOT NULL
);
CREATE INDEX oidc_refresh_tokens_family
  ON oidc_refresh_tokens(family_id);

-- Signing keys and their lifecycle status. The private JWK is stored whole;
-- encrypting it at rest is an operator decision documented at the store
-- boundary (see the sqlStore doc comment).
CREATE TABLE oidc_signing_keys (
  kid          TEXT PRIMARY KEY,
  private_jwk  TEXT NOT NULL,       -- JSON of the RsaPrivateJwk
  status       TEXT NOT NULL,       -- active | retiring | retired
  created_at   INTEGER NOT NULL
);
CREATE INDEX oidc_signing_keys_status
  ON oidc_signing_keys(status);

-- migrate:down

DROP TABLE oidc_signing_keys;
DROP TABLE oidc_refresh_tokens;
DROP TABLE oidc_access_grants;
DROP TABLE oidc_authorization_codes;
DROP TABLE oidc_sessions;
DROP TABLE oidc_pending_requests;
DROP TABLE oidc_client_redirect_uris;
DROP TABLE oidc_clients;
