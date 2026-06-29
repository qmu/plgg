import {
  test,
  check,
  all,
  toBe,
  toContain,
  toHaveLength,
  okThen,
  errThen,
} from "plgg-test";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverPaths } from "plgg-server/Ssg/usecase/writeStatic";

test("discoverPaths maps md files to route paths", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "ssg-disc-"),
  );
  await writeFile(
    join(root, "index.md"),
    "# home",
    "utf8",
  );
  await writeFile(
    join(root, "about.md"),
    "# about",
    "utf8",
  );
  await mkdir(join(root, "guide"), {
    recursive: true,
  });
  await writeFile(
    join(root, "guide", "index.md"),
    "# guide",
    "utf8",
  );
  await writeFile(
    join(root, "guide", "intro.md"),
    "# intro",
    "utf8",
  );
  // a non-md file is ignored
  await writeFile(
    join(root, "logo.svg"),
    "<svg/>",
    "utf8",
  );
  // an excluded dir is skipped
  await mkdir(join(root, "node_modules"), {
    recursive: true,
  });
  await writeFile(
    join(root, "node_modules", "dep.md"),
    "# dep",
    "utf8",
  );
  const result =
    await discoverPaths(root);
  await rm(root, {
    recursive: true,
    force: true,
  });
  return check(
    result,
    okThen((paths) =>
      all([
        check(paths, toHaveLength(4)),
        check(paths, toContain("/")),
        check(paths, toContain("/about/")),
        check(paths, toContain("/guide/")),
        check(
          paths,
          toContain("/guide/intro/"),
        ),
      ]),
    ),
  );
});

test("discoverPaths errs on a missing root", async () => {
  const result = await discoverPaths(
    join(tmpdir(), "ssg-does-not-exist-xyz"),
  );
  return check(
    result,
    errThen((e) =>
      check(e.__tag, toBe("WriteFailed")),
    ),
  );
});
