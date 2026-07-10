import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type SoftStr,
  type PromisedResult,
  ok,
  err,
  isErr,
} from "plgg";
import {
  type SettingsError,
  settingsError,
  memorySettingsStore,
} from "plgg-cms/Admin/settingsStore";

// a stub validator: any non-empty key is accepted.
const validate = (
  key: SoftStr,
): PromisedResult<null, SettingsError> =>
  Promise.resolve(
    key.length > 0
      ? ok(null)
      : err(settingsError("empty key")),
  );

test("a fresh store reports the key absent", () =>
  check(
    memorySettingsStore(validate).llmKeyStatus(),
    toBe("absent"),
  ));

test("a valid key validates, stores, and reports configured", async () => {
  const store = memorySettingsStore(validate);
  const set = await store.setLlmKey("sk-live-abc");
  return all([
    check(isErr(set), toBe(false)),
    check(store.llmKeyStatus(), toBe("configured")),
  ]);
});

test("an invalid key is rejected and never stored (status stays absent)", async () => {
  const store = memorySettingsStore(validate);
  const set = await store.setLlmKey("");
  return all([
    check(isErr(set), toBe(true)),
    check(store.llmKeyStatus(), toBe("absent")),
  ]);
});

test("the store exposes no path to read the plaintext back", () => {
  const store = memorySettingsStore(validate);
  // the only readable surface is the status enum; there is no
  // getter for the secret (enforced by the type — asserted here
  // as documentation of the write-only contract).
  const keys = Object.keys(store).sort();
  return all([
    check(
      keys.join(","),
      toBe("llmKeyStatus,setLlmKey"),
    ),
    check(
      store.llmKeyStatus() === "configured" ||
        store.llmKeyStatus() === "absent",
      toBe(true),
    ),
  ]);
});
