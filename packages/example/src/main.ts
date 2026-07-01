import {
  pipe,
  fromNullable,
  mapOption,
} from "plgg";
import { application } from "plgg-view/client";
import { app } from "./app.ts";

/**
 * CSR entry — the client half of the isomorphic demo. Mounts the To-Do app onto
 * `#root` (the same node the SSR `pageResponse` fills with server-rendered
 * markup), so the client `application` runtime takes over the server's output.
 * `application` (not `sandbox`) so the runtime owns the URL too — `filter`/`q`
 * are reflected to the address bar and seeded back from a deep link. This is the
 * only side-effecting line.
 */
pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) =>
    application(app)(root),
  ),
);
