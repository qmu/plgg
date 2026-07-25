import {
  mkdtemp,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type OpenDoc } from "plggpress/framework/DevServer/usecase/voiceDoc";
import {
  test,
  check,
  all,
  toBe,
  someThen,
  shouldBeNone,
} from "plgg-test";
import { openDocReader } from "plggpress/framework/DevServer/node/openDoc";

// A content root shaped like a real docs tree: a root page, a
// leaf `.md`, and a section `index.md` — the three shapes
// `discoverPaths` collapses onto routes.
const fixture = async (): Promise<string> => {
  const root = await mkdtemp(
    join(tmpdir(), "plggpress-opendoc-"),
  );
  await mkdir(join(root, "guide"), {
    recursive: true,
  });
  await writeFile(
    join(root, "index.md"),
    "# Home\n",
    "utf8",
  );
  await writeFile(
    join(root, "guide", "intro.md"),
    "# Intro\n\nIntro body.\n",
    "utf8",
  );
  await writeFile(
    join(root, "guide", "index.md"),
    "# Guide\n\nGuide body.\n",
    "utf8",
  );
  return root;
};

test("the root route resolves to index.md", async () => {
  const root = await fixture();
  return check(
    await openDocReader(root)("/"),
    someThen((doc: OpenDoc) =>
      all([
        toBe("index.md")(doc.path),
        toBe("# Home\n")(doc.text),
      ]),
    ),
  );
});

test("a leaf route resolves to <segs>.md", async () => {
  const root = await fixture();
  return check(
    await openDocReader(root)("/guide/intro/"),
    someThen((doc: OpenDoc) =>
      all([
        toBe(join("guide", "intro.md"))(doc.path),
        toBe("# Intro\n\nIntro body.\n")(
          doc.text,
        ),
      ]),
    ),
  );
});

test("a section route falls through to its index.md", async () => {
  const root = await fixture();
  return check(
    await openDocReader(root)("/guide/"),
    someThen((doc: OpenDoc) =>
      toBe(join("guide", "index.md"))(doc.path),
    ),
  );
});

test("a route with no document behind it is None", async () => {
  const root = await fixture();
  return check(
    await openDocReader(root)("/nowhere/"),
    shouldBeNone(),
  );
});
