import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkRequestClosure } from "./requestCloseBoundary.ts";

const fixture = () => {
  const requests = [155, 156].map((issue) => ({
    requestId: `synthetic-request-${issue}`,
    issue,
    package: "plgg-bundle",
    publishedVersion: "0.0.7",
    closureConditions: [`condition-${issue}`],
  }));
  const terminal = {
    schemaVersion: 1,
    registry: "https://registry.npmjs.org",
    complete: true,
    issues: requests.map((request) => ({
      issue: request.issue,
      url: `https://github.com/qmu/plgg/issues/${request.issue}`,
      package: request.package,
      npmVersion: request.publishedVersion,
      latest: request.publishedVersion,
      publicationMatched: true,
      canClose: true,
      blockers: [],
      closureChecks:
        request.closureConditions.map((id) => ({
          id,
          passed: true,
        })),
    })),
  };
  const bytes = JSON.stringify(terminal);
  const receipts = requests.map((request) => ({
    ...structuredClone(request),
    terminalSha256: createHash("sha256")
      .update(bytes)
      .digest("hex"),
  }));
  return {
    manifest: { schemaVersion: 1, requests },
    receipts: { schemaVersion: 1, receipts },
    terminal,
  };
};
type Fixture = ReturnType<typeof fixture>;
const check = (input: Fixture) =>
  checkRequestClosure(
    input.manifest,
    input.receipts,
    JSON.stringify(input.terminal),
  );
const rebind = (input: Fixture) => {
  for (const receipt of input.receipts.receipts)
    receipt.terminalSha256 = createHash("sha256")
      .update(JSON.stringify(input.terminal))
      .digest("hex");
};

test("one complete tuple per received request permits closure", () => {
  assert.equal(check(fixture()).complete, true);
});
const mutations: [
  string,
  (input: Fixture) => void,
][] = [
  [
    "swapped request IDs across issues",
    (f) => {
      f.receipts.receipts[0]!.requestId =
        "synthetic-request-156";
      f.receipts.receipts[1]!.requestId =
        "synthetic-request-155";
    },
  ],
  [
    "wrong issue",
    (f) => {
      f.receipts.receipts[0]!.issue = 158;
    },
  ],
  [
    "wrong package",
    (f) => {
      f.receipts.receipts[0]!.package =
        "plgg-view";
    },
  ],
  [
    "wrong published version",
    (f) => {
      f.receipts.receipts[0]!.publishedVersion =
        "0.0.8";
    },
  ],
  [
    "swapped closure conditions",
    (f) => {
      f.receipts.receipts[0]!.closureConditions =
        ["condition-156"];
    },
  ],
  [
    "missing receipt",
    (f) => {
      f.receipts.receipts.pop();
    },
  ],
  [
    "extra receipt",
    (f) => {
      f.receipts.receipts.push(
        structuredClone(f.receipts.receipts[0]!),
      );
    },
  ],
  [
    "duplicate request",
    (f) => {
      f.manifest.requests[1]!.requestId =
        f.manifest.requests[0]!.requestId;
    },
  ],
  [
    "empty request ID",
    (f) => {
      f.manifest.requests[0]!.requestId = "";
    },
  ],
  [
    "no closure conditions",
    (f) => {
      f.manifest.requests[0]!.closureConditions =
        [];
    },
  ],
  [
    "duplicate conditions",
    (f) => {
      f.manifest.requests[0]!.closureConditions.push(
        "condition-155",
      );
    },
  ],
  [
    "old terminal bytes",
    (f) => {
      f.terminal.complete = false;
    },
  ],
  [
    "unknown manifest schema",
    (f) => {
      f.manifest.schemaVersion = 2;
    },
  ],
];
for (const [name, mutate] of mutations)
  test(`rejects ${name}`, () => {
    const f = fixture();
    mutate(f);
    assert.equal(check(f).complete, false);
  });
const terminalMutations: [
  string,
  (input: Fixture) => void,
][] = [
  [
    "different npm version",
    (f) => {
      f.terminal.issues[0]!.npmVersion = "0.0.8";
    },
  ],
  [
    "different latest",
    (f) => {
      f.terminal.issues[0]!.latest = "0.0.8";
    },
  ],
  [
    "blocked issue",
    (f) => {
      f.terminal.issues[0]!.canClose = false;
    },
  ],
  [
    "failed publication",
    (f) => {
      f.terminal.issues[0]!.publicationMatched = false;
    },
  ],
  [
    "failed closure check",
    (f) => {
      f.terminal.issues[0]!.closureChecks[0]!.passed = false;
    },
  ],
  [
    "missing closure check",
    (f) => {
      f.terminal.issues[0]!.closureChecks = [];
    },
  ],
  [
    "duplicate closure check",
    (f) => {
      f.terminal.issues[0]!.closureChecks.push({
        id: "condition-155",
        passed: true,
      });
    },
  ],
  [
    "duplicate issue",
    (f) => {
      f.terminal.issues.push(
        structuredClone(f.terminal.issues[0]!),
      );
    },
  ],
  [
    "wrong registry",
    (f) => {
      f.terminal.registry =
        "https://example.invalid";
    },
  ],
];
for (const [name, mutate] of terminalMutations)
  test(`rejects freshly bound ${name}`, () => {
    const f = fixture();
    mutate(f);
    rebind(f);
    assert.equal(check(f).complete, false);
  });
test("rejects missing envelopes, malformed JSON and empty manifests", () => {
  for (const value of [
    null,
    {},
    [],
    { schemaVersion: 1, requests: [] },
  ])
    assert.equal(
      checkRequestClosure(value, {}, "{}")
        .complete,
      false,
    );
  assert.equal(
    checkRequestClosure({}, {}, "{").complete,
    false,
  );
});
test("CLI exits successfully only for a bound tuple and does not echo invalid input", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "request-boundary-"),
  );
  try {
    const f = fixture();
    const paths = [
      "manifest",
      "receipts",
      "terminal",
    ].map((name) =>
      join(directory, `${name}.json`),
    );
    [f.manifest, f.receipts, f.terminal].forEach(
      (value, index) =>
        writeFileSync(
          paths[index]!,
          JSON.stringify(value),
        ),
    );
    const run = () =>
      spawnSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "scripts/requestCloseBoundary.ts",
          ...paths,
        ],
        { encoding: "utf8" },
      );
    assert.equal(run().status, 0);
    writeFileSync(
      paths[0]!,
      "synthetic-private-marker",
    );
    const failed = run();
    assert.equal(failed.status, 1);
    assert.equal(
      failed.stderr.includes(
        "synthetic-private-marker",
      ),
      false,
    );
  } finally {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
});

test("condition order and unrelated blocked issues do not change this batch decision", () => {
  const f = fixture();
  f.manifest.requests[0]!.closureConditions.push(
    "second-condition",
  );
  f.receipts.receipts[0]!.closureConditions = [
    "second-condition",
    "condition-155",
  ];
  f.terminal.issues[0]!.closureChecks.push({
    id: "second-condition",
    passed: true,
  });
  f.terminal.complete = false;
  f.terminal.issues.push({
    issue: 158,
    url: "https://github.com/qmu/plgg/issues/158",
    package: "plgg-view",
    npmVersion: "0.0.2",
    latest: "0.0.2",
    publicationMatched: false,
    canClose: false,
    blockers: [],
    closureChecks: [],
  });
  rebind(f);
  assert.equal(check(f).complete, true);
});
test("duplicate receipts with the right total count cannot replace a request", () => {
  const f = fixture();
  f.receipts.receipts[1] = structuredClone(
    f.receipts.receipts[0]!,
  );
  assert.equal(check(f).complete, false);
});
test("successful flags cannot override blockers or a foreign issue URL", () => {
  const f = fixture();
  const terminal: unknown = {
    ...f.terminal,
    issues: f.terminal.issues.map((row) => ({
      ...row,
      blockers: ["still-pending"],
    })),
  };
  const bytes = JSON.stringify(terminal);
  for (const receipt of f.receipts.receipts)
    receipt.terminalSha256 = createHash("sha256")
      .update(bytes)
      .digest("hex");
  assert.equal(
    checkRequestClosure(
      f.manifest,
      f.receipts,
      bytes,
    ).complete,
    false,
  );
  f.terminal.issues[0]!.url =
    "https://github.com/other/project/issues/155";
  rebind(f);
  assert.equal(check(f).complete, false);
});
test("malformed field types and schema versions fail closed", () => {
  for (const replacement of [
    null,
    [],
    155,
    " ",
    " leading",
    {},
  ]) {
    const f = fixture();
    const manifest: unknown = {
      ...f.manifest,
      requests: [
        {
          ...f.manifest.requests[0],
          requestId: replacement,
        },
      ],
    };
    assert.equal(
      checkRequestClosure(
        manifest,
        f.receipts,
        JSON.stringify(f.terminal),
      ).complete,
      false,
    );
  }
  for (const replacement of [
    null,
    [],
    "condition-155",
    ["condition-155", "condition-155"],
    [1],
  ]) {
    const f = fixture();
    const receipts: unknown = {
      ...f.receipts,
      receipts: f.receipts.receipts.map(
        (row) => ({
          ...row,
          closureConditions: replacement,
        }),
      ),
    };
    assert.equal(
      checkRequestClosure(
        f.manifest,
        receipts,
        JSON.stringify(f.terminal),
      ).complete,
      false,
    );
  }
  const f = fixture();
  f.receipts.schemaVersion = 2;
  assert.equal(check(f).complete, false);
});
