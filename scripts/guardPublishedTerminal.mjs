import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";

const registry = "https://registry.npmjs.org";
const names = [
  "plgg",
  "plgg-bundle",
  "plgg-view",
];
const object = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);
const version = (value) =>
  typeof value === "string" &&
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(
    value,
  );

async function readLatest(name) {
  const response = await fetch(
    `${registry}/${name}`,
    {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok)
    throw Error("registry-unavailable");
  const metadata = await response.json();
  if (
    !object(metadata) ||
    metadata.name !== name ||
    !object(metadata["dist-tags"]) ||
    !version(metadata["dist-tags"].latest)
  )
    throw Error("invalid-metadata");
  return metadata["dist-tags"].latest;
}

async function observe(read) {
  return Promise.all(
    names.map(async (name) => {
      try {
        const latest = await read(name);
        return {
          name,
          latest: version(latest) ? latest : null,
        };
      } catch {
        return { name, latest: null };
      }
    }),
  );
}

async function save(target, value) {
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(
      temporary,
      `${JSON.stringify(value, null, 2)}\n`,
      {
        flag: "wx",
        mode: 0o600,
      },
    );
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}

// The producer owns consumer validation; this boundary owns tag stability only.
// A candidate is private until BOTH observations and its acquired versions agree.
export async function guardPublishedTerminal(
  output,
  checkpoint,
  options = {},
) {
  const target = resolve(output);
  const resume = resolve(checkpoint);
  if (target === resume)
    throw Error("distinct-paths-required");
  await mkdir(dirname(target), {
    recursive: true,
  });
  await mkdir(dirname(resume), {
    recursive: true,
  });
  const candidate = join(
    dirname(target),
    `.plgg-candidate-${randomUUID()}.json`,
  );
  const read = options.readLatest ?? readLatest;
  const state = {
    schemaVersion: 1,
    registry,
    complete: false,
    reason: "acquisition-required",
    restartFrom: "acquisition",
    startedAt: new Date().toISOString(),
    initial: [],
    final: [],
  };
  // Invalidate a previous checkpoint before even the first network operation.
  await save(resume, state);
  try {
    state.initial = await observe(read);
    if (
      state.initial.some(
        (item) => item.latest === null,
      )
    ) {
      state.reason = "initial-tag-unavailable";
      return state;
    }
    await save(resume, state);
    const run =
      options.runTerminal ??
      (
        await import(
          pathToFileURL(
            join(
              options.producerDirectory ??
                dirname(
                  fileURLToPath(import.meta.url),
                ),
              "publishedTerminal.mjs",
            ),
          ).href
        )
      ).runTerminal;
    await run(candidate, {
      producerDirectory:
        options.producerDirectory,
    });
    // Read what would actually be committed, never trust the producer's return value.
    const evidence = JSON.parse(
      await readFile(candidate, "utf8"),
    );
    if (
      !object(evidence) ||
      evidence.complete !== true ||
      evidence.registry !== registry ||
      !Array.isArray(evidence.packages) ||
      evidence.packages.length !== names.length ||
      !state.initial.every(
        ({ name, latest }) =>
          evidence.packages.filter(
            (item) =>
              object(item) &&
              item.name === name &&
              item.version === latest,
          ).length === 1,
      )
    ) {
      state.reason =
        "candidate-not-bound-to-initial-tags";
      return state;
    }
    // All producer work and candidate writes precede the final network read.
    state.final = await observe(read);
    if (
      state.final.some(
        (item) => item.latest === null,
      )
    ) {
      state.reason = "final-tag-unavailable";
      return state;
    }
    if (
      state.initial.some(
        (item, index) =>
          item.latest !==
          state.final[index].latest,
      )
    ) {
      state.reason = "dist-tag-conflict";
      return state;
    }
    await (options.rename ?? rename)(
      candidate,
      target,
    );
    state.reason = "committed";
    state.restartFrom = null;
    return state;
  } catch {
    state.reason = "terminal-boundary-failed";
    return state;
  } finally {
    await rm(candidate, { force: true });
    // Checkpoints are never completion evidence, including after a commit.
    await save(resume, state);
  }
}

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (
      process.argv.length < 4 ||
      process.argv.length > 5
    )
      throw Error("arguments");
    const result = await guardPublishedTerminal(
      process.argv[2],
      process.argv[3],
      {
        producerDirectory: process.argv[4]
          ? resolve(process.argv[4])
          : undefined,
      },
    );
    console.log(
      `published terminal guard: ${result.reason}`,
    );
    process.exitCode =
      result.reason === "committed" ? 0 : 1;
  } catch {
    console.error(
      "published terminal guard: checkpoint-persistence-failed",
    );
    process.exitCode = 1;
  }
}
