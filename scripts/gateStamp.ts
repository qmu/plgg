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
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(
  fileURLToPath(import.meta.url),
);
const repoRoot = dirname(scriptsDir);

/** The git-ignored stamp file's absolute path. */
export const stampPath = (root: string): string =>
  join(root, ".check-all-green.stamp");

/**
 * Runs a git subcommand in `root` and returns its trimmed stdout.
 * `extraEnv` is merged over the ambient environment (used to point a
 * git call at a private, throwaway index via `GIT_INDEX_FILE`). Injected
 * so a test can simulate a transient failure.
 */
export type GitRunner = (
  args: ReadonlyArray<string>,
  root: string,
  extraEnv?: Record<string, string>,
) => string;

export const gitOnce: GitRunner = (
  args,
  root,
  extraEnv,
) =>
  execFileSync("git", [...args], {
    cwd: root,
    encoding: "utf8",
    env: extraEnv
      ? { ...process.env, ...extraEnv }
      : process.env,
  }).trim();

/** Sleep synchronously for `ms` (bounded backoff between retries). */
const sleepMs = (ms: number): void => {
  Atomics.wait(
    new Int32Array(new SharedArrayBuffer(4)),
    0,
    0,
    ms,
  );
};

/**
 * Wrap a {@link GitRunner} so a transient failure is retried a few times
 * with a short, growing backoff instead of aborting an otherwise-green
 * gate. `check-all`'s final stamp step must never fail on a passing tree
 * because a single git invocation lost a race (git op contention across
 * concurrent worktrees/sessions).
 */
export const withRetry =
  (
    run: GitRunner,
    attempts = 4,
    backoffMs = 50,
  ): GitRunner =>
  (args, root, extraEnv) => {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i += 1) {
      try {
        return run(args, root, extraEnv);
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) {
          sleepMs(backoffMs * (i + 1));
        }
      }
    }
    throw lastErr;
  };

/**
 * A content digest of the tracked, checked-out working tree:
 * `<HEAD>-<tree>`. The tree sha is computed lock-free against a private,
 * throwaway index (`GIT_INDEX_FILE`): seed it from `HEAD`, stage tracked
 * edits (`add -u`, so untracked files — the stamp itself, built `dist/`
 * — never move the digest), then `write-tree`. Unlike `git stash create`
 * this touches no shared ref (there is no stash stack to contend on), so
 * it can't lose a race with a concurrent worktree; for identical tracked
 * content it yields the identical tree object, so existing stamps stay
 * valid. Every git call is retried, so a transient hiccup is tolerated.
 */
export const treeDigest = (
  root: string,
  run: GitRunner = withRetry(gitOnce),
): string => {
  const head = run(["rev-parse", "HEAD"], root);
  const indexDir = mkdtempSync(
    join(tmpdir(), "gate-stamp-idx-"),
  );
  try {
    const env = {
      GIT_INDEX_FILE: join(indexDir, "index"),
    };
    run(["read-tree", "HEAD"], root, env);
    run(["add", "-u"], root, env);
    const tree = run(["write-tree"], root, env);
    return `${head}-${tree}`;
  } finally {
    rmSync(indexDir, {
      recursive: true,
      force: true,
    });
  }
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
