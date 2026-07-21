/**
 * Same-session green gate stamp.
 *
 * `check-all.sh`, on a fully green run, records a stamp capturing the
 * tracked working-tree state it certified; `publish-npm.sh` auto-skips
 * the gate when a valid stamp matches the current tree — so `SKIP_GATE=1`
 * stops being something a human must remember.
 *
 * The stamp is a content digest of the checked-out tracked state, NOT a
 * timestamp: `<HEAD sha>-<working-tree sha>`, where the working-tree sha
 * is the content-addressed tree object of the tracked working tree
 * (`git stash create`'s tree when there are tracked edits, else
 * `HEAD^{tree}`). Any tracked edit changes the tree object, so an
 * uncommitted change made after the stamp is written invalidates it. The
 * stamp file itself is git-ignored, so writing it never moves the digest.
 *
 * Usage:
 *   node scripts/gateStamp.ts write   # compute + write the stamp (green run)
 *   node scripts/gateStamp.ts check   # exit 0 (print short digest) iff the
 *                                      # stamp matches the current tree
 *
 * Zero new dependencies: Node + the ambient `git` CLI only.
 */
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(
  fileURLToPath(import.meta.url),
);
const repoRoot = dirname(scriptsDir);

/** The git-ignored stamp file's absolute path. */
export const stampPath = (root: string): string =>
  join(root, ".check-all-green.stamp");

const git = (
  args: ReadonlyArray<string>,
  root: string,
): string =>
  execFileSync("git", [...args], {
    cwd: root,
    encoding: "utf8",
  }).trim();

/**
 * A content digest of the tracked, checked-out working tree:
 * `<HEAD>-<tree>`. `git stash create` yields a commit whose `^{tree}`
 * is the content-addressed tree of the tracked working tree (including
 * uncommitted edits); it prints nothing when the tree is clean, in which
 * case the digest uses `HEAD^{tree}`. Untracked files (the stamp itself,
 * built `dist/`) are not part of either tree, so they never move the
 * digest.
 */
export const treeDigest = (root: string): string => {
  const head = git(["rev-parse", "HEAD"], root);
  const stash = git(["stash", "create"], root);
  const treeRef =
    stash.length > 0
      ? `${stash}^{tree}`
      : "HEAD^{tree}";
  const tree = git(["rev-parse", treeRef], root);
  return `${head}-${tree}`;
};

/** A short, human-facing form of a `<HEAD>-<tree>` digest. */
export const shortDigest = (digest: string): string => {
  const [head, tree] = digest.split("-");
  return `${(head ?? "").slice(0, 9)}-${(
    tree ?? ""
  ).slice(0, 9)}`;
};

/** Read the recorded digest, or `null` when no stamp exists. */
export const readStamp = (
  root: string,
): string | null => {
  const path = stampPath(root);
  if (!existsSync(path)) {
    return null;
  }
  const content = readFileSync(path, "utf8").trim();
  return content.length > 0 ? content : null;
};

/** Record the current tree digest as the green stamp. */
export const writeStamp = (root: string): string => {
  const digest = treeDigest(root);
  writeFileSync(stampPath(root), `${digest}\n`);
  return digest;
};

/**
 * Does the recorded stamp certify the current tree? True only when a
 * stamp exists and its digest equals the freshly computed one.
 */
export const stampMatches = (root: string): boolean => {
  const recorded = readStamp(root);
  return (
    recorded !== null && recorded === treeDigest(root)
  );
};

const main = (): void => {
  const cmd = process.argv[2];
  if (cmd === "write") {
    writeStamp(repoRoot);
    return;
  }
  if (cmd === "check") {
    if (stampMatches(repoRoot)) {
      const recorded = readStamp(repoRoot);
      process.stdout.write(
        `${shortDigest(recorded ?? "")}\n`,
      );
      return;
    }
    process.exit(1);
  }
  process.stderr.write(
    "usage: gateStamp.ts <write|check>\n",
  );
  process.exit(2);
};

// Run the CLI only when invoked directly, never when a spec imports the
// helpers above (node --test loads this module and would otherwise hit
// the usage-error exit).
const invoked = process.argv[1];
if (
  invoked !== undefined &&
  fileURLToPath(import.meta.url) === resolve(invoked)
) {
  main();
}
