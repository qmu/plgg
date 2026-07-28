import {
  test,
  check,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { resolveVoiceModule } from "plggpress/framework/DevServer/usecase/voiceModule";

test("serves the client entry", () =>
  check(
    resolveVoiceModule("voiceClient"),
    okThen((file) =>
      toBe("voiceClient.ts")(file),
    ),
  ));

test("serves the pure protocol sibling the client imports", () =>
  check(
    resolveVoiceModule("voiceProtocol"),
    okThen((file) =>
      toBe("voiceProtocol.ts")(file),
    ),
  ));

test("serves the arbiter sibling the client imports", () =>
  check(
    resolveVoiceModule("reloadArbiter"),
    okThen((file) =>
      toBe("reloadArbiter.ts")(file),
    ),
  ));

test("refuses an unlisted sibling in the same directory", () =>
  check(
    resolveVoiceModule("voiceProtocol.spec"),
    errThen((e) => toBe("Unknown")(e.kind)),
  ));

test("refuses a traversal", () =>
  check(
    resolveVoiceModule("../../../cli"),
    errThen((e) => toBe("Unknown")(e.kind)),
  ));

test("refuses an extension-bearing name", () =>
  check(
    resolveVoiceModule("voiceClient.ts"),
    errThen((e) => toBe("Unknown")(e.kind)),
  ));

test("refuses an empty name", () =>
  check(
    resolveVoiceModule(""),
    errThen((e) => toBe("Unknown")(e.kind)),
  ));
