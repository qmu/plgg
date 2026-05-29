import { pipe, fromNullable, mapOption } from "plgg";
import { sandbox } from "plgg-view/client";
import { app } from "./app";

/**
 * Mounts the To-Do app onto `#app`. The runtime owns state and re-rendering;
 * this is the only side-effecting line in the client.
 */
pipe(
  fromNullable(document.getElementById("app")),
  mapOption((root: HTMLElement) =>
    sandbox(app)(root),
  ),
);
