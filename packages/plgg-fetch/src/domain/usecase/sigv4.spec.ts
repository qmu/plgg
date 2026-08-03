import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
} from "plgg-test";
import { some, none } from "plgg";
import {
  Sigv4Credentials,
  Sigv4Instant,
  Sigv4Scope,
  Sigv4Request,
} from "plgg-fetch/index";
import {
  canonicalQuery,
  canonicalUri,
  credentialScope,
  signedHeaders,
  sigv4Auth,
  sigv4Instant,
  sigv4Pairs,
  sigv4PayloadHash,
  sigv4Sign,
} from "plgg-fetch/index";
import {
  SELF_INCONSISTENT_VECTORS,
  SIGV4_VECTORS,
  Sigv4Vector,
  VECTOR_ACCESS_KEY_ID,
  VECTOR_AMZ_DATE,
  VECTOR_REGION,
  VECTOR_SECRET_ACCESS_KEY,
  VECTOR_SERVICE,
} from "plgg-fetch/domain/usecase/fixtures/sigv4Vectors";

/**
 * The credentials AWS's published suite signs every vector
 * with. Long-lived (no session token), so no
 * `x-amz-security-token` participates.
 */
const vectorCredentials: Sigv4Credentials = {
  accessKeyId: VECTOR_ACCESS_KEY_ID,
  secretAccessKey: VECTOR_SECRET_ACCESS_KEY,
  sessionToken: none(),
};

const vectorScope: Sigv4Scope = {
  region: VECTOR_REGION,
  service: VECTOR_SERVICE,
};

const vectorInstant: Sigv4Instant = {
  amzDate: VECTOR_AMZ_DATE,
  dateStamp: VECTOR_AMZ_DATE.slice(0, 8),
};

const requestOf = (
  vector: Sigv4Vector,
): Sigv4Request => ({
  method: vector.method,
  path: vector.path,
  query: vector.query,
  headers: vector.headers,
  body: vector.body,
});

// One test per published vector. Table-driven registration:
// each AWS case is its own named test, so a regression names
// the exact case that broke rather than "sigv4 failed".
//
// Every case asserts the CANONICAL REQUEST, which is the
// half of AWS's published files that is unambiguous. The
// string to sign and the signature are asserted only where
// the case's own files agree with each other — two of them
// do not, and no signer can satisfy both halves of a
// self-contradicting vector (see `selfConsistent` on the
// fixture, and the exact-exclusion test below).
SIGV4_VECTORS.forEach((vector: Sigv4Vector) =>
  test(`AWS vector ${vector.name}: canonical request${vector.selfConsistent ? ", string to sign, and signature" : " (its own .sts contradicts its .creq)"}`, async () =>
    check(
      await sigv4Sign({
        credentials: vectorCredentials,
        scope: vectorScope,
        instant: vectorInstant,
        request: requestOf(vector),
      }),
      okThen((signed) =>
        all([
          check(
            signed.canonicalRequest,
            toBe(vector.canonicalRequest),
          ),
          ...(vector.selfConsistent
            ? [
                check(
                  signed.stringToSign,
                  toBe(vector.stringToSign),
                ),
                check(
                  signed.authorization,
                  toBe(vector.authorization),
                ),
              ]
            : []),
        ]),
      ),
    )),
);

test("exactly the two known self-contradicting AWS cases are exempt", () =>
  check(
    SIGV4_VECTORS.filter(
      (v: Sigv4Vector): boolean =>
        !v.selfConsistent,
    ).map((v: Sigv4Vector): string => v.name),
    toEqual([
      "post-x-www-form-urlencoded",
      "post-x-www-form-urlencoded-parameters",
    ]),
  ));

test("the exempt set is exactly what the fixture recorded", () =>
  check(
    SIGV4_VECTORS.filter(
      (v: Sigv4Vector): boolean =>
        !v.selfConsistent,
    ).map((v: Sigv4Vector): string => v.name),
    toEqual([...SELF_INCONSISTENT_VECTORS]),
  ));

test("canonicalUri renders an empty path as the root", () =>
  check(canonicalUri(""), toBe("/")));

test("canonicalUri percent-encodes per RFC 3986, keeping the separators", () =>
  all([
    check(
      canonicalUri("/a b/c"),
      toBe("/a%20b/c"),
    ),
    // The five characters encodeURIComponent leaves raw but
    // RFC 3986 reserves — the difference AWS rejects on.
    check(
      canonicalUri("/!'()*"),
      toBe("/%21%27%28%29%2A"),
    ),
  ]));

test("canonicalQuery signs a value-less parameter as name=", () =>
  check(
    canonicalQuery([{ name: "a", value: "" }]),
    toBe("a="),
  ));

test("canonicalQuery renders an empty query as the empty string", () =>
  check(canonicalQuery([]), toBe("")));

test("signedHeaders lowercases, de-duplicates and sorts", () =>
  check(
    signedHeaders([
      { name: "X-Amz-Date", value: "d" },
      { name: "Host", value: "h" },
      { name: "host", value: "h2" },
    ]),
    toBe("host;x-amz-date"),
  ));

test("credentialScope binds date, region, service and the terminator", () =>
  check(
    credentialScope(vectorInstant, vectorScope),
    toBe(
      "20150830/us-east-1/service/aws4_request",
    ),
  ));

test("sigv4Instant splits a UTC instant into its two SigV4 shapes", () =>
  check(
    sigv4Instant(
      new Date("2015-08-30T12:36:00.000Z"),
    ),
    toEqual({
      amzDate: "20150830T123600Z",
      dateStamp: "20150830",
    }),
  ));

test("sigv4Pairs adapts a Dict to ordered wire pairs", () =>
  check(
    sigv4Pairs({ host: "example.com", a: "b" }),
    toEqual([
      { name: "host", value: "example.com" },
      { name: "a", value: "b" },
    ]),
  ));

test("sigv4PayloadHash is the hex SHA-256 of the body", async () =>
  check(
    await sigv4PayloadHash(""),
    okThen((hash) =>
      check(
        hash,
        toBe(
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        ),
      ),
    ),
  ));

test("sigv4Auth returns only the Authorization header for long-lived credentials", async () =>
  check(
    await sigv4Auth({
      credentials: vectorCredentials,
      scope: vectorScope,
      instant: vectorInstant,
      request: requestOf(
        vectorFor("get-vanilla"),
      ),
    }),
    okThen((headers) =>
      check(
        headers,
        toEqual({
          authorization: vectorFor("get-vanilla")
            .authorization,
        }),
      ),
    ),
  ));

test("sigv4Auth emits x-amz-security-token for temporary credentials", async () =>
  check(
    await sigv4Auth({
      credentials: {
        ...vectorCredentials,
        sessionToken: some("session-token"),
      },
      scope: vectorScope,
      instant: vectorInstant,
      request: requestOf(
        vectorFor("get-vanilla"),
      ),
    }),
    okThen((headers) =>
      check(
        headers["x-amz-security-token"],
        toBe("session-token"),
      ),
    ),
  ));

/**
 * Looks a published vector up by name. Throws (in a spec,
 * where a throw is a failed test) rather than returning an
 * `Option`, because a missing vector means the fixture is
 * broken, not that the code under test misbehaved.
 */
function vectorFor(name: string): Sigv4Vector {
  const found = SIGV4_VECTORS.find(
    (v: Sigv4Vector): boolean => v.name === name,
  );
  if (found === undefined) {
    throw new Error(
      `no published vector named ${name}`,
    );
  }
  return found;
}
