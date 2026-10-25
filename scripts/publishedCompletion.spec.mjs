import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  checkIds,
  complete,
  fingerprint,
  repeatBuild,
} from "./publishedCompletion.mjs";

test("completion requires every distinct probe, including raw and both frame/lazy behaviors", () => {
  const checks = checkIds.map((id) => ({
    id,
    status: "passed",
  }));
  assert.equal(complete(checks), true);
  for (const status of ["failed", "blocked"]) {
    for (
      let index = 0;
      index < checks.length;
      index++
    ) {
      assert.equal(
        complete(
          checks.map((check, i) =>
            i === index
              ? { ...check, status }
              : check,
          ),
        ),
        false,
      );
    }
  }
  assert.equal(complete(checks.slice(1)), false);
  assert.equal(
    complete([...checks.slice(1), checks[1]]),
    false,
  );
});

test("hashes describe the downloaded bytes and reject corrupted tarballs", () => {
  const bytes = Buffer.from("registry tarball");
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  assert.equal(
    fingerprint(bytes, integrity).sha256,
    createHash("sha256")
      .update(bytes)
      .digest("hex"),
  );
  assert.throws(
    () =>
      fingerprint(
        Buffer.from("modified"),
        integrity,
      ),
    /tarball-integrity/,
  );
  assert.throws(
    () => fingerprint(bytes, undefined),
    /tarball-integrity/,
  );
});

function scratch(run) {
  const cwd = mkdtempSync(
    join(tmpdir(), "completion-test-"),
  );
  try {
    run(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}
function emit(cwd, value) {
  mkdirSync(join(cwd, "dist"), {
    recursive: true,
  });
  writeFileSync(
    join(cwd, "dist/main.js"),
    `console.log(${value});`,
  );
}

test("restart probe executes two freshly generated different outputs in the same directory", () =>
  scratch((cwd) => {
    let calls = 0;
    repeatBuild(cwd, () => {
      calls++;
      const source = readFileSync(
        join(cwd, "src/main.ts"),
        "utf8",
      );
      emit(
        cwd,
        source.includes("= 41") ? 41 : 42,
      );
    });
    assert.equal(calls, 2);
  }));
test("restart probe rejects a second-start EISDIR", () =>
  scratch((cwd) => {
    let calls = 0;
    assert.throws(
      () =>
        repeatBuild(cwd, () => {
          if (++calls === 2)
            throw Error("ERR_FS_EISDIR");
          emit(cwd, 41);
        }),
      /ERR_FS_EISDIR/,
    );
  }));
test("restart probe rejects stale output even when the build reports success", () =>
  scratch((cwd) => {
    assert.throws(
      () => repeatBuild(cwd, () => emit(cwd, 41)),
      /stale-output/,
    );
  }));
test("restart probe deletes previous output so a no-op second build cannot pass", () =>
  scratch((cwd) => {
    let calls = 0;
    assert.throws(
      () =>
        repeatBuild(cwd, () => {
          if (++calls === 1) emit(cwd, 41);
        }),
      /command-failed/,
    );
  }));
