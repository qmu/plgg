import {
  pipe,
  fromNullable,
  mapOption,
} from "plgg";
import { sandbox } from "plgg-view/client";
import { app } from "./app";

/**
 * CSR entry — the client half of the isomorphic demo. Mounts the To-Do app onto
 * `#root` (the same node the SSR `pageResponse` fills with server-rendered
 * markup), so the client `sandbox` takes over the server's output. The runtime
 * owns state and re-rendering; this is the only side-effecting line.
 */
pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) =>
    sandbox(app)(root),
  ),
);
