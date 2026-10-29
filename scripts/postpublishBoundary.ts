import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

type Entry = {
  issue: number;
  package: string;
  commit: string;
  version: string;
  rollback: string;
};
const record = (
  v: unknown,
): v is Record<string, unknown> =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v);
const version = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d+\.\d+\.\d+$/.test(v);
const sha = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{40}$/.test(v);

export function decode(value: unknown): Entry[] {
  if (!Array.isArray(value) || value.length !== 4)
    throw new Error("INVALID_PLAN");
  const entries: Entry[] = [];
  for (const row of value) {
    if (
      !record(row) ||
      typeof row.issue !== "number" ||
      ![155, 156, 157, 158].includes(row.issue) ||
      entries.some(
        (e) => e.issue === row.issue,
      ) ||
      row.package !==
        (row.issue <= 156
          ? "plgg-bundle"
          : "plgg-view") ||
      !sha(row.commit) ||
      !version(row.version) ||
      !version(row.rollback) ||
      row.version === row.rollback
    )
      throw new Error("INVALID_PLAN");
    entries.push({
      issue: row.issue,
      package:
        row.issue <= 156
          ? "plgg-bundle"
          : "plgg-view",
      commit: row.commit,
      version: row.version,
      rollback: row.rollback,
    });
  }
  for (const entry of entries) {
    if (
      entries.some(
        (other) =>
          other.package === entry.package &&
          (other.version !== entry.version ||
            other.rollback !== entry.rollback),
      )
    )
      throw new Error("INVALID_PLAN");
  }
  return entries;
}

type Dependencies = {
  ancestor: (
    commit: string,
    target: string,
  ) => boolean;
  manifest: (
    commit: string,
    name: string,
  ) => unknown;
  metadata: (
    name: string,
    version: string,
  ) => Promise<unknown>;
  tarball: (url: string) => Promise<Uint8Array>;
};

export async function inspect(
  plan: unknown,
  deps: Dependencies,
) {
  const entries = decode(plan);
  const results = [];
  for (const entry of entries) {
    let reason = "MATCH";
    let published: {
      version: string;
      gitHead: string;
      integrity: string;
    } | null = null;
    try {
      if (
        !deps.ancestor(
          entry.commit,
          "origin/main",
        )
      )
        reason = "FIX_NOT_IN_MAIN";
      else {
        const meta = await deps.metadata(
          entry.package,
          entry.version,
        );
        if (
          !record(meta) ||
          meta.name !== entry.package ||
          !version(meta.version) ||
          !sha(meta.gitHead) ||
          !record(meta.dist) ||
          typeof meta.dist.tarball !== "string" ||
          typeof meta.dist.integrity !==
            "string" ||
          !/^sha512-[A-Za-z0-9+/]{86}==$/.test(
            meta.dist.integrity,
          )
        )
          reason = "INVALID_REGISTRY_METADATA";
        else {
          published = {
            version: meta.version,
            gitHead: meta.gitHead,
            integrity: meta.dist.integrity,
          };
          if (meta.version !== entry.version)
            reason = "REGISTRY_VERSION_MISMATCH";
          else if (
            !deps.ancestor(
              meta.gitHead,
              "origin/main",
            ) ||
            !deps.ancestor(
              entry.commit,
              meta.gitHead,
            )
          )
            reason = "PUBLISHED_COMMIT_MISMATCH";
          else {
            const manifest = deps.manifest(
              meta.gitHead,
              entry.package,
            );
            if (
              !record(manifest) ||
              manifest.name !== entry.package ||
              manifest.version !== entry.version
            )
              reason =
                "PUBLISHED_VERSION_MISMATCH";
            else {
              const url = new URL(
                meta.dist.tarball,
              );
              if (
                url.origin !==
                  "https://registry.npmjs.org" ||
                url.username ||
                url.password ||
                url.pathname !==
                  `/${entry.package}/-/${entry.package}-${entry.version}.tgz` ||
                url.search ||
                url.hash
              )
                reason = "UNSAFE_TARBALL_URL";
              else {
                const bytes = await deps.tarball(
                  url.href,
                );
                const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
                if (
                  integrity !==
                  meta.dist.integrity
                )
                  reason =
                    "TARBALL_INTEGRITY_MISMATCH";
              }
            }
          }
        }
      }
    } catch {
      reason = "EVIDENCE_UNAVAILABLE";
    }
    results.push({
      ...entry,
      reason,
      published,
      rollbackTarget:
        reason === "MATCH"
          ? null
          : `${entry.package}@${entry.rollback}`,
    });
  }
  return {
    schemaVersion: 1,
    complete: results.every(
      (r) => r.reason === "MATCH",
    ),
    results,
  };
}

function git(args: string[]) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10000,
  });
}
async function get(url: string) {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error("EVIDENCE_UNAVAILABLE");
  return response;
}
if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(process.argv[1]).href
) {
  let failure = "INVALID_PLAN";
  try {
    const input: unknown = JSON.parse(
      readFileSync(process.argv[2] ?? "", "utf8"),
    );
    decode(input);
    failure = "EVIDENCE_UNAVAILABLE";
    git(["fetch", "origin", "main"]);
    const metadata = new Map<
      string,
      Promise<unknown>
    >();
    const result = await inspect(input, {
      ancestor: (commit, target) => {
        try {
          git([
            "merge-base",
            "--is-ancestor",
            commit,
            target,
          ]);
          return true;
        } catch {
          return false;
        }
      },
      manifest: (commit, name) =>
        JSON.parse(
          git([
            "show",
            `${commit}:packages/${name}/package.json`,
          ]),
        ),
      metadata: (name) => {
        const cached = metadata.get(name);
        if (cached) return cached;
        const request = get(
          `https://registry.npmjs.org/${name}/latest`,
        ).then((response) => response.json());
        metadata.set(name, request);
        return request;
      },
      tarball: async (url) =>
        new Uint8Array(
          await (await get(url)).arrayBuffer(),
        ),
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.complete ? 0 : 1;
  } catch {
    console.log(
      JSON.stringify({
        schemaVersion: 1,
        complete: false,
        reason: failure,
      }),
    );
    process.exitCode = 1;
  }
}
