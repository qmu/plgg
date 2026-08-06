import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
  okThen,
  errThen,
  vi,
  afterEach,
} from "plgg-test";
import { some, none } from "plgg";
import {
  createSign,
  generateKeyPairSync,
} from "node:crypto";
import {
  GcpServiceAccount,
  GcpTokenRequest,
  GCP_TOKEN_ENDPOINT,
  JWT_BEARER_GRANT_TYPE,
  gcpAccessToken,
  gcpAssertion,
  gcpBearerAuth,
  gcpClaimsJson,
  gcpExchangeAssertion,
  gcpJwtClaims,
  gcpSigningInput,
} from "plgg-fetch/index";

/**
 * A throwaway RSA key pair, generated FRESH for each run.
 *
 * Deliberately not a fixture: a committed private key —
 * even a disposable one — is a real key in a repository,
 * and it trips every credential scanner for a good reason.
 * Generating one per run costs milliseconds and leaves
 * nothing behind.
 */
const keyPair = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

const account: GcpServiceAccount = {
  clientEmail:
    "svc@example-project.iam.gserviceaccount.com",
  privateKeyPem: keyPair.privateKey,
};

const tokenRequest: GcpTokenRequest = {
  scope:
    "https://www.googleapis.com/auth/cloud-platform",
  subject: none(),
};

const ISSUED_AT = 1440938160;

/**
 * Signs with Node's `crypto` — an implementation entirely
 * independent of the Web Crypto path under test. RS256
 * (RSASSA-PKCS1-v1_5) is deterministic, so if our signature
 * equals this one over the same input, our signer is
 * interoperable rather than merely self-consistent.
 */
const nodeRs256Base64Url = (
  message: string,
): string =>
  createSign("RSA-SHA256")
    .update(message)
    .sign(keyPair.privateKey, "base64url");

type FetchImpl = (
  request: Request,
) => Promise<Response>;

const stubFetch = (impl: FetchImpl): void =>
  vi.stubGlobal("fetch", impl);

const captureFetch = (): {
  seen: () => Request;
} => {
  let captured: Request | undefined;
  stubFetch(async (req: Request) => {
    captured = req;
    return new Response(
      JSON.stringify({
        access_token: "stub-access-token",
        expires_in: 3599,
        token_type: "Bearer",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  });
  return {
    seen: () => {
      if (captured === undefined) {
        throw new Error("fetch was not called");
      }
      return captured;
    },
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test("gcpJwtClaims builds the documented GCP claim set", () =>
  check(
    gcpJwtClaims(
      account,
      tokenRequest,
      ISSUED_AT,
    ),
    toEqual({
      iss: "svc@example-project.iam.gserviceaccount.com",
      scope:
        "https://www.googleapis.com/auth/cloud-platform",
      aud: GCP_TOKEN_ENDPOINT,
      exp: ISSUED_AT + 3600,
      iat: ISSUED_AT,
    }),
  ));

test("gcpJwtClaims adds sub only under domain-wide delegation", () =>
  check(
    gcpJwtClaims(
      account,
      {
        ...tokenRequest,
        subject: some("user@example.com"),
      },
      ISSUED_AT,
    ).sub,
    toBe("user@example.com"),
  ));

test("gcpClaimsJson pins the key order and escapes its values", () =>
  all([
    check(
      gcpClaimsJson(
        gcpJwtClaims(
          account,
          tokenRequest,
          ISSUED_AT,
        ),
      ),
      toBe(
        `{"iss":"svc@example-project.iam.gserviceaccount.com","scope":"https://www.googleapis.com/auth/cloud-platform","aud":"${GCP_TOKEN_ENDPOINT}","exp":${ISSUED_AT + 3600},"iat":${ISSUED_AT}}`,
      ),
    ),
    // A quote in a value must be escaped, not close the string.
    check(
      gcpClaimsJson(
        gcpJwtClaims(
          {
            ...account,
            clientEmail: 'a"b',
          },
          tokenRequest,
          ISSUED_AT,
        ),
      ),
      toContain('"iss":"a\\"b"'),
    ),
  ]));

test("gcpSigningInput is base64url(header).base64url(claims) with the fixed RS256 header", () =>
  check(
    gcpSigningInput(
      gcpJwtClaims(
        account,
        tokenRequest,
        ISSUED_AT,
      ),
    ).split(".")[0],
    // base64url of {"alg":"RS256","typ":"JWT"}
    toBe("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9"),
  ));

test("gcpAssertion signs the input with RS256, matching an independent implementation", async () => {
  const claims = gcpJwtClaims(
    account,
    tokenRequest,
    ISSUED_AT,
  );
  const signingInput = gcpSigningInput(claims);
  return check(
    await gcpAssertion({ account, claims }),
    okThen((assertion) =>
      all([
        check(
          assertion,
          toBe(
            `${signingInput}.${nodeRs256Base64Url(signingInput)}`,
          ),
        ),
        // Three dot-separated base64url segments, no padding.
        check(
          assertion.split(".").length,
          toBe(3),
        ),
        check(
          assertion.includes("="),
          toBe(false),
        ),
      ]),
    ),
  );
});

test("gcpAssertion folds a malformed private key to a Defect instead of throwing", async () =>
  check(
    await gcpAssertion({
      account: {
        ...account,
        privateKeyPem: "not a pem",
      },
      claims: gcpJwtClaims(
        account,
        tokenRequest,
        ISSUED_AT,
      ),
    }),
    errThen((e) =>
      check(e.__tag, toBe("Defect")),
    ),
  ));

test("gcpExchangeAssertion POSTs the RFC 7523 form body through this package's transport", async () => {
  const captured = captureFetch();
  const result = await gcpExchangeAssertion(
    "the.signed.assertion",
  );
  const request = captured.seen();
  const body = await request.text();
  return all([
    check(request.method, toBe("POST")),
    check(request.url, toBe(GCP_TOKEN_ENDPOINT)),
    check(
      request.headers.get("content-type"),
      toBe("application/x-www-form-urlencoded"),
    ),
    check(
      body,
      toBe(
        `grant_type=${encodeURIComponent(JWT_BEARER_GRANT_TYPE)}&assertion=the.signed.assertion`,
      ),
    ),
    check(
      result,
      okThen((token) =>
        check(
          token,
          toEqual({
            accessToken: "stub-access-token",
            expiresIn: 3599,
            tokenType: "Bearer",
          }),
        ),
      ),
    ),
  ]);
});

test("gcpExchangeAssertion reports the status when the endpoint returns an error body", async () => {
  stubFetch(
    async () =>
      new Response(
        JSON.stringify({
          error: "invalid_grant",
        }),
        { status: 400 },
      ),
  );
  return check(
    await gcpExchangeAssertion("a.b.c"),
    errThen((e) =>
      check(e.content.message, toContain("400")),
    ),
  );
});

test("gcpExchangeAssertion folds a transport failure to a Defect", async () => {
  stubFetch(async () => {
    throw new Error("connection refused");
  });
  return check(
    await gcpExchangeAssertion("a.b.c"),
    errThen((e) =>
      check(
        e.content.message,
        toContain("transport"),
      ),
    ),
  );
});

test("gcpAccessToken signs and exchanges in one call", async () => {
  const captured = captureFetch();
  const result = await gcpAccessToken(
    account,
    tokenRequest,
    ISSUED_AT,
  );
  const body = await captured.seen().text();
  return all([
    // The assertion that went over the wire is the one our
    // signer produced for these claims.
    check(
      body,
      toContain(
        encodeURIComponent(
          gcpSigningInput(
            gcpJwtClaims(
              account,
              tokenRequest,
              ISSUED_AT,
            ),
          ),
        ),
      ),
    ),
    check(
      result,
      okThen((token) =>
        check(
          token.accessToken,
          toBe("stub-access-token"),
        ),
      ),
    ),
  ]);
});

test("gcpAccessToken surfaces a signing failure without exchanging", async () => {
  stubFetch(async () => {
    throw new Error("fetch must not be called");
  });
  return check(
    await gcpAccessToken(
      { ...account, privateKeyPem: "not a pem" },
      tokenRequest,
      ISSUED_AT,
    ),
    errThen((e) =>
      check(e.__tag, toBe("Defect")),
    ),
  );
});

test("gcpBearerAuth renders the obtained token as an Authorization header", () =>
  check(
    gcpBearerAuth({
      accessToken: "stub-access-token",
      expiresIn: 3599,
      tokenType: "Bearer",
    }),
    toEqual({
      authorization: "Bearer stub-access-token",
    }),
  ));
