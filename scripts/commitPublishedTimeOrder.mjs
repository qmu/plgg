import { randomUUID } from "node:crypto";
import { readFile, writeFile, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const fields = ["fetchedAt", "preflightAt", "publishedAt", "checkedAt"];

// Canonical UTC milliseconds avoid permissive Date.parse normalization (Feb 30,
// offsets, date-only values) and make equal timestamps an explicit valid case.
export function validateNpmTimeOrder(evidence) {
  if (!object(evidence) || evidence.complete !== true)
    throw Error("incomplete-terminal-evidence");
  const timeline = evidence.npmTimeline;
  if (!object(timeline)) throw Error("invalid-npm-timestamp");
  const times = fields.map((field) => {
    const value = timeline[field];
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString() !== value
    )
      throw Error("invalid-npm-timestamp");
    return Date.parse(value);
  });
  if (times.some((time, index) => index > 0 && time < times[index - 1]))
    throw Error("npm-time-order-reversed");
  return evidence;
}

// Compatible with #228's options.rename. Commit exactly the bytes checked,
// rather than renaming a candidate that another writer could have replaced.
export async function commitPublishedTimeOrder(candidate, output) {
  if (resolve(candidate) === resolve(output))
    throw Error("distinct-paths-required");
  const bytes = await readFile(candidate);
  let evidence;
  try {
    evidence = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw Error("invalid-terminal-json");
  }
  validateNpmTimeOrder(evidence);
  const temporary = `${resolve(output)}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (process.argv.length !== 4) throw Error("arguments-required");
    await commitPublishedTimeOrder(process.argv[2], process.argv[3]);
    console.log("npm time order: committed");
  } catch (error) {
    const reasons = [
      "incomplete-terminal-evidence",
      "invalid-npm-timestamp",
      "npm-time-order-reversed",
      "invalid-terminal-json",
      "distinct-paths-required",
      "arguments-required",
    ];
    console.error(
      `npm time order: ${error instanceof Error && reasons.includes(error.message) ? error.message : "persistence-failed"}`,
    );
    process.exitCode = 1;
  }
}
