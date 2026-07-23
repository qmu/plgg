import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { box, some, none } from "plgg";
import {
  asIssuedCode,
  asAccessGrant,
  asRefreshRecord,
  asSigningKeyRecord,
  asSessionRow,
  asPendingRow,
  buildClient,
  decodeAuthorizationRequest,
  encodeAuthorizationRequest,
  encodeScopes,
} from "plgg-auth/Sql/rows";

const goodCodeRow = {
  code: "c1",
  client_id: "demo-rp",
  redirect_uri: "https://rp.example/cb",
  subject: "u",
  scopes: "openid email",
  nonce: null,
  code_challenge: "a".repeat(43),
  expires_at: 100,
};

test("asIssuedCode decodes a well-formed row and rejects a malformed one", () =>
  all([
    check(
      asIssuedCode(goodCodeRow),
      okThen((c) => toBe(2)(c.scopes.length)),
    ),
    // bad code_challenge shape
    check(
      asIssuedCode({
        ...goodCodeRow,
        code_challenge: "short",
      }),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    // missing field
    check(
      asIssuedCode({ code: "c1" }),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    // not an object
    check(
      asIssuedCode("nope"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asIssuedCode keeps a present nonce", () =>
  check(
    asIssuedCode({
      ...goodCodeRow,
      nonce: "n-1",
    }),
    okThen((c) =>
      check(c.nonce.__tag, toBe("Some")),
    ),
  ));

test("asAccessGrant decodes and rejects", () =>
  all([
    check(
      asAccessGrant({
        token: "at",
        subject: "u",
        client_id: "demo-rp",
        scopes: "openid",
        expires_at: 10,
      }),
      okThen((g) => toBe("at")(g.token.content)),
    ),
    check(
      asAccessGrant({ token: "at" }),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

const goodRefreshRow = {
  token_hash: "r".repeat(43),
  family_id: "fam",
  client_id: "demo-rp",
  subject: "u",
  scopes: "openid",
  rotated_from: null,
  status: "active",
  expires_at: 10,
};

test("asRefreshRecord decodes, rejects a bad status, keeps rotated_from", () =>
  all([
    check(
      asRefreshRecord(goodRefreshRow),
      okThen((r) =>
        check(r.status, toBe("active")),
      ),
    ),
    check(
      asRefreshRecord({
        ...goodRefreshRow,
        status: "bogus",
      }),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asRefreshRecord({
        ...goodRefreshRow,
        rotated_from: "p".repeat(43),
      }),
      okThen((r) =>
        check(r.rotatedFrom.__tag, toBe("Some")),
      ),
    ),
  ]));

test("asSigningKeyRecord rejects bad status and malformed JWK JSON", () =>
  all([
    check(
      asSigningKeyRecord({
        kid: "k",
        private_jwk: "not json",
        status: "active",
        created_at: 0,
      }),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asSigningKeyRecord({
        kid: "k",
        private_jwk: "{}",
        status: "bogus",
        created_at: 0,
      }),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asSessionRow decodes and rejects", () =>
  all([
    check(
      asSessionRow({
        id: "s1",
        subject: "u",
        expires_at: 10,
      }),
      okThen((s) => toBe(10)(s.expiresAt)),
    ),
    check(
      asSessionRow({ id: "s1" }),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asPendingRow parses the payload and rejects malformed JSON", () => {
  const req = {
    clientId: box("ClientId")("demo-rp"),
    redirectUri: box("RedirectUri")(
      "https://rp.example/cb",
    ),
    scopes: [box("Scope")("openid")],
    state: some(box("State")("st")),
    nonce: none(),
    codeChallenge: box("CodeChallenge")(
      "a".repeat(43),
    ),
  };
  const payload = encodeAuthorizationRequest(req);
  return all([
    check(
      asPendingRow({
        id: "p1",
        payload,
        expires_at: 10,
      }),
      okThen((p) => toBe("p1")(p.id.content)),
    ),
    check(
      asPendingRow({
        id: "p1",
        payload: "{not json",
        expires_at: 10,
      }),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]);
});

test("buildClient assembles a client with its redirect uris, rejects a bad base", () =>
  all([
    check(
      buildClient(
        { id: "demo-rp", secret_hash: null },
        [
          {
            redirect_uri: "https://rp.example/cb",
          },
        ],
      ),
      okThen((c) =>
        toBe(1)(c.redirectUris.length),
      ),
    ),
    check(
      buildClient(
        { id: "demo-rp", secret_hash: null },
        [{ redirect_uri: "not a uri" }],
      ),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      buildClient({ id: "" }, []),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("decodeAuthorizationRequest round-trips and rejects a bad scope list", () => {
  const req = {
    clientId: box("ClientId")("demo-rp"),
    redirectUri: box("RedirectUri")(
      "https://rp.example/cb",
    ),
    scopes: [
      box("Scope")("openid"),
      box("Scope")("email"),
    ],
    state: none(),
    nonce: none(),
    codeChallenge: box("CodeChallenge")(
      "a".repeat(43),
    ),
  };
  return all([
    check(
      decodeAuthorizationRequest(
        encodeAuthorizationRequest(req),
      ),
      okThen((r) => toBe(2)(r.scopes.length)),
    ),
    check(
      decodeAuthorizationRequest(
        JSON.stringify({
          client_id: "demo-rp",
          redirect_uri: "https://rp.example/cb",
          code_challenge: "a".repeat(43),
          scopes: "not an array",
          state: null,
          nonce: null,
        }),
      ),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]);
});

test("encodeScopes joins on spaces", () =>
  check(
    encodeScopes([
      box("Scope")("openid"),
      box("Scope")("email"),
    ]),
    toBe("openid email"),
  ));

test("asIssuedCode treats an absent nonce key as None", () => {
  const { nonce, ...noNonce } = goodCodeRow;
  void nonce;
  return check(
    asIssuedCode(noNonce),
    okThen((c) =>
      check(c.nonce.__tag, toBe("None")),
    ),
  );
});
