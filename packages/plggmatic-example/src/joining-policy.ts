import { defineJoining } from "plggmatic";

export const parentOrigin =
  "http://localhost:51820";
export const childOrigin =
  "http://localhost:51821";
export const viewPath = "/guide/";
export const parentPolicy = defineJoining({
  origin: parentOrigin,
  partners: [
    {
      origin: childOrigin,
      trust: "public",
      paths: [viewPath],
    },
  ],
  parentRoutes: ["/"],
});
export const childPolicy = defineJoining({
  origin: childOrigin,
  embedders: [
    { origin: parentOrigin, trust: "public" },
  ],
  routes: [
    {
      path: viewPath,
      access: "public",
      mode: "readOnly",
      label: "plggpress guide",
    },
  ],
});
