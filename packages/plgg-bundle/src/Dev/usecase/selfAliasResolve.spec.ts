import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  resolve,
  type Resolved,
} from "../../../bin/hook.mjs";

// The loader hook's `resolve` rewrites `plgg-bundle/<sub>`
// self-alias specifiers to on-disk `src/<sub>` files. These
// drive it directly (the alias branch short-circuits before
// `nextResolve`, so a stub suffices).

const ctx = { parentURL: undefined };
const fallthrough = async (): Promise<Resolved> => ({
  url: "file:///fallthrough",
});

test(
  "bare-directory self-alias resolves to its index.ts, not the directory (EISDIR guard)",
  async () => {
    const r = await resolve(
      "plgg-bundle/Dev/fixtures/aliasDir",
      ctx,
      fallthrough,
    );
    return all([
      check(
        r.url.endsWith("/aliasDir/index.ts"),
        toBe(true),
      ),
      check(r.shortCircuit ?? false, toBe(true)),
    ]);
  },
);

test(
  "file self-alias still resolves to the .ts file (no regression)",
  async () => {
    const r = await resolve(
      "plgg-bundle/index",
      ctx,
      fallthrough,
    );
    return check(
      r.url.endsWith("/src/index.ts"),
      toBe(true),
    );
  },
);

test(
  "a self-alias with no matching file falls through to nextResolve",
  async () => {
    const r = await resolve(
      "plgg-bundle/does/not/exist",
      ctx,
      fallthrough,
    );
    return check(
      r.url,
      toBe("file:///fallthrough"),
    );
  },
);
