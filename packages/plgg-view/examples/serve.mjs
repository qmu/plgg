// Local browser example: built package exports, no login or external assets.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const assets = new Map([
  [
    "/",
    [
      new URL("./svg.html", import.meta.url),
      "text/html",
    ],
  ],
  [
    "/svg.js",
    [
      new URL("./svg.js", import.meta.url),
      "text/javascript",
    ],
  ],
  [
    "/view.js",
    [
      new URL(
        "../dist/index.es.js",
        import.meta.url,
      ),
      "text/javascript",
    ],
  ],
  [
    "/client.js",
    [
      process.argv[3] ??
        fileURLToPath(
          new URL(
            "../dist/client.es.js",
            import.meta.url,
          ),
        ),
      "text/javascript",
    ],
  ],
  [
    "/plgg.js",
    [
      new URL(
        "../../plgg/dist/index.es.js",
        import.meta.url,
      ),
      "text/javascript",
    ],
  ],
]);
createServer(async (req, res) => {
  const asset = assets.get(
    new URL(req.url ?? "/", "http://localhost")
      .pathname,
  );
  if (!asset) {
    res.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(asset[0]);
    res
      .writeHead(200, {
        "Content-Type": asset[1],
        "Cache-Control": "no-store",
      })
      .end(body);
  } catch {
    res
      .writeHead(500)
      .end(
        "Build plgg and plgg-view first; see README.md.",
      );
  }
}).listen(
  Number(process.argv[2] ?? 51821),
  "127.0.0.1",
  () => {
    console.log(
      `SVG example: http://127.0.0.1:${process.argv[2] ?? 51821}`,
    );
  },
);
