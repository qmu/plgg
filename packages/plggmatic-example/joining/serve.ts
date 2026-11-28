import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import {
  pipe,
  mapResult,
  fromNullable,
  getOr,
  isSome,
} from "plgg";
import {
  type JoiningPolicy,
  joiningHeaders,
} from "plggmatic";
import {
  parentPolicy,
  childPolicy,
  viewPath,
} from "../src/joining-policy.ts";

const entry =
  '<script type="module" src="/joining.js"></script>';
const script = readFileSync("dist/joining.js");
const pages = new Map(
  [viewPath, "/edit/"].map((path) => [
    path,
    readFileSync(
      "dist/joining-child" + path + "index.html",
      "utf8",
    ).replace("</head>", entry + "</head>"),
  ]),
);
const serve =
  (pages: ReadonlyMap<string, string>) =>
  (policy: JoiningPolicy) =>
    createServer((req, res) => {
      const path = pipe(
        fromNullable(req.url?.split("?")[0]),
        getOr(""),
      );
      const page = fromNullable(pages.get(path));
      const asset = path === "/joining.js";
      const directives = joiningHeaders(
        policy,
        isSome(page) ? path : "",
      );
      res
        .writeHead(
          asset || isSome(page) ? 200 : 404,
          {
            "Content-Type": asset
              ? "text/javascript"
              : "text/html; charset=utf-8",
            // The public view only runs the versioned module.
            "Content-Security-Policy":
              directives[
                "Content-Security-Policy"
              ] + "; script-src 'self'",
          },
        )
        .end(
          asset
            ? script
            : pipe(page, getOr("Page not found")),
        );
    }).listen(
      Number(new URL(policy.origin).port),
      "localhost",
    );

pipe(
  parentPolicy,
  mapResult(
    serve(
      new Map([
        [
          "/",
          '<!doctype html><meta charset="utf-8"><title>Joining apps</title><body>' +
            entry,
        ],
      ]),
    ),
  ),
);
pipe(childPolicy, mapResult(serve(pages)));
