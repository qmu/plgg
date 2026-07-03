import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { none, box, isOk } from "plgg";
import {
  Client,
  asClientId,
  asClientSecretHash,
  asRedirectUri,
  clientIdString,
  redirectUriString,
  hasRedirectUri,
  hashClientSecret,
} from "plgg-auth/index";

test("asClientId accepts non-empty, rejects empty", () =>
  all([
    check(
      asClientId("abc"),
      okThen((id) =>
        toBe("abc")(clientIdString(id)),
      ),
    ),
    check(
      asClientId(""),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asClientSecretHash requires a 43-char base64url digest", () =>
  all([
    check(
      asClientSecretHash("a".repeat(43)),
      okThen((h) =>
        check(typeof h.content, toBe("string")),
      ),
    ),
    check(
      asClientSecretHash("short"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asRedirectUri accepts absolute http(s), rejects fragments and relatives", () =>
  all([
    check(
      asRedirectUri("https://rp.example/cb"),
      okThen((u) =>
        toBe("https://rp.example/cb")(
          redirectUriString(u),
        ),
      ),
    ),
    check(
      asRedirectUri("/relative"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asRedirectUri("https://rp.example/cb#frag"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asRedirectUri("not a url"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("hasRedirectUri matches exactly", () => {
  const uri = asRedirectUri(
    "https://rp.example/cb",
  );
  if (!isOk(uri)) {
    return check(isOk(uri), toBe(true));
  }
  const client: Client = {
    id: box("ClientId")("c"),
    secretHash: none(),
    redirectUris: [uri.content],
  };
  return all([
    check(
      hasRedirectUri(
        client,
        "https://rp.example/cb",
      ),
      toBe(true),
    ),
    check(
      hasRedirectUri(
        client,
        "https://rp.example/other",
      ),
      toBe(false),
    ),
  ]);
});

test("hashClientSecret produces a stable 43-char digest and matches roundtrip", async () => {
  const first = await hashClientSecret("s3cret");
  const second = await hashClientSecret("s3cret");
  const other =
    await hashClientSecret("different");
  if (
    !isOk(first) ||
    !isOk(second) ||
    !isOk(other)
  ) {
    return check(
      isOk(first) && isOk(second) && isOk(other),
      toBe(true),
    );
  }
  return all([
    check(first.content.content.length, toBe(43)),
    check(
      first.content.content ===
        second.content.content,
      toBe(true),
    ),
    check(
      first.content.content ===
        other.content.content,
      toBe(false),
    ),
  ]);
});

test("asRedirectUri accepts an http:// (loopback dev) URL", () =>
  check(
    asRedirectUri("http://localhost:3000/cb"),
    okThen((u) =>
      toBe("http://localhost:3000/cb")(
        redirectUriString(u),
      ),
    ),
  ));
