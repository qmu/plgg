// Runtime-neutral SSG surface: model + the pure render core. No `node:fs` —
// the filesystem seam lives behind the node-only `plgg-server/ssg` entry.
export * from "plgg-server/Ssg/model";
export * from "plgg-server/Ssg/usecase";
