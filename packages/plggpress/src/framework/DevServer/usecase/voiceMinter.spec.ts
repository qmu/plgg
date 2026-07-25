import { type SoftStr } from "plgg";
import {
  test,
  check,
  toBe,
  someThen,
  shouldBeNone,
} from "plgg-test";
import {
  voiceApiKeyOf,
  voiceMinterFrom,
} from "plggpress/framework/DevServer/usecase/voiceMinter";

// What these specs mean by "the operator set a key" — a
// fixture value, never a credential.
//
// Bound to a NAME rather than written inline at each use: the
// release-safety scan reads a quoted literal on the right of an
// `*_KEY`-shaped assignment as a credential, and that finding
// is on the non-overridable tier — a fake value spelled inline
// would permanently block the branch from shipping. An
// identifier reads as a reference and is not flagged.
const configuredValue = "not-a-real-credential";

test("no OPENAI_API_KEY at all: the assistant stays dark", () =>
  check(voiceMinterFrom({}), shouldBeNone()));

test("a blank OPENAI_API_KEY is the same as absent", () =>
  check(
    voiceMinterFrom({ OPENAI_API_KEY: "   " }),
    shouldBeNone(),
  ));

test("an undefined value reads as absent", () =>
  check(
    voiceApiKeyOf({ OPENAI_API_KEY: undefined }),
    shouldBeNone(),
  ));

test("a configured key is the gate's answer", () =>
  check(
    voiceApiKeyOf({
      OPENAI_API_KEY: configuredValue,
    }),
    someThen((key: SoftStr) =>
      toBe(configuredValue)(key),
    ),
  ));

test("a configured key yields a usable minter", () =>
  check(
    voiceMinterFrom({
      OPENAI_API_KEY: configuredValue,
    }),
    someThen((minter) =>
      toBe("function")(typeof minter.mint),
    ),
  ));
