// Pure render core only — `writeStatic` (the node:fs seam) is intentionally
// NOT re-exported here, so the runtime-neutral `Ssg` barrel never pulls in
// `node:fs`. The seam is surfaced solely through the node entry `src/ssgEntry.ts`.
export * from "plgg-server/Ssg/usecase/renderRoutes";
