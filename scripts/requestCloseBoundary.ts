import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);
const object = (
  value: unknown,
): Record<string, unknown> =>
  isRecord(value) ? value : {};
const rows = (
  value: unknown,
): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(object) : [];
const unique = (values: unknown[]): boolean =>
  new Set(values).size === values.length;
const text = (value: unknown): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value === value.trim();
const conditions = (value: unknown): string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(text) &&
  unique(value)
    ? value
    : [];
const sameConditions = (
  left: string[],
  right: string[],
): boolean =>
  left.length > 0 &&
  left.length === right.length &&
  left.every((id) => right.includes(id));

/** Read-only final receipt boundary; inputs come from trusted collectors. */
export const checkRequestClosure = (
  manifestInput: unknown,
  receiptInput: unknown,
  terminalBytes: string,
) => {
  const manifest = object(manifestInput);
  const receipts = object(receiptInput);
  const expected = rows(manifest.requests);
  const actual = rows(receipts.receipts);
  let terminal: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(
      terminalBytes,
    );
    terminal = object(parsed);
  } catch {
    return {
      complete: false,
      reason: "invalid-terminal-json",
    };
  }
  const digest = createHash("sha256")
    .update(terminalBytes)
    .digest("hex");
  const issues = rows(terminal.issues);
  const envelope =
    manifest.schemaVersion === 1 &&
    receipts.schemaVersion === 1 &&
    terminal.schemaVersion === 1 &&
    terminal.registry ===
      "https://registry.npmjs.org" &&
    expected.length > 0 &&
    expected.length === actual.length &&
    unique(
      expected.map((row) => row.requestId),
    ) &&
    unique(actual.map((row) => row.requestId)) &&
    unique(issues.map((row) => row.issue));
  const complete =
    envelope &&
    expected.every((request) => {
      const receipt = actual.find(
        (row) =>
          row.requestId === request.requestId,
      );
      const issue = issues.find(
        (row) => row.issue === request.issue,
      );
      if (!receipt || !issue) return false;
      const required = conditions(
        request.closureConditions,
      );
      const checks = rows(issue.closureChecks);
      return (
        text(request.requestId) &&
        Number.isSafeInteger(request.issue) &&
        typeof request.issue === "number" &&
        request.issue > 0 &&
        text(request.package) &&
        typeof request.publishedVersion ===
          "string" &&
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(
          request.publishedVersion,
        ) &&
        receipt.issue === request.issue &&
        receipt.package === request.package &&
        receipt.publishedVersion ===
          request.publishedVersion &&
        receipt.terminalSha256 === digest &&
        sameConditions(
          required,
          conditions(receipt.closureConditions),
        ) &&
        issue.url ===
          `https://github.com/qmu/plgg/issues/${request.issue}` &&
        issue.package === request.package &&
        issue.npmVersion ===
          request.publishedVersion &&
        issue.latest ===
          request.publishedVersion &&
        issue.publicationMatched === true &&
        issue.canClose === true &&
        Array.isArray(issue.blockers) &&
        issue.blockers.length === 0 &&
        checks.length === required.length &&
        unique(checks.map((check) => check.id)) &&
        checks.every(
          (check) =>
            typeof check.id === "string" &&
            required.includes(check.id) &&
            check.passed === true,
        )
      );
    });
  return {
    complete,
    reason: complete
      ? "receipt-bound"
      : "request-closure-mismatch",
  };
};

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const [
      manifestPath,
      receiptsPath,
      terminalPath,
    ] = process.argv.slice(2);
    if (
      !manifestPath ||
      !receiptsPath ||
      !terminalPath ||
      process.argv.length !== 5
    )
      throw Error("arguments");
    const manifest: unknown = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    );
    const receipts: unknown = JSON.parse(
      readFileSync(receiptsPath, "utf8"),
    );
    const result = checkRequestClosure(
      manifest,
      receipts,
      readFileSync(terminalPath, "utf8"),
    );
    console.log(JSON.stringify(result));
    process.exitCode = result.complete ? 0 : 1;
  } catch {
    console.error(
      "request-close-boundary: input-failed",
    );
    process.exitCode = 1;
  }
}
