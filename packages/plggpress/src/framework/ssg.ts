// Public subpath entry mirroring `plgg-server/ssg` — the
// node-only static-site surface (writeStatic, discoverPaths,
// copyAssets, generateStatic, …). Kept off the runtime-neutral
// root barrel for the same reason the wrapped package keeps
// it off its own: this is the ONLY entry that pulls in the
// node:fs seam. Pure re-export; no logic lives here.
export * from "plgg-server/ssg";
