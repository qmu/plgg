import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  slugify,
  makeSluggers,
} from "plgg-md/Render/usecase/slugify";

/** Em-dash (U+2014) — RETAINED by the algorithm. */
const EM = "—";

// The spike's captured heading -> slug oracle table
// (`spike-decisions.md` §3). `slugify` operates on the
// heading's already-resolved PLAIN text (backticks gone),
// so the inputs here are the plain forms.
test("reproduces the EXACT VitePress slug oracle table", () =>
  all([
    check(
      slugify("Prefer Str for strings"),
      toBe("prefer-str-for-strings"),
    ),
    check(
      slugify(`plgg ${EM} values & effects`),
      toBe(`plgg-${EM}-values-effects`),
    ),
    check(
      slugify(
        `Atomics vs Basics ${EM} the one distinction worth learning`,
      ),
      toBe(
        `atomics-vs-basics-${EM}-the-one-distinction-worth-learning`,
      ),
    ),
    check(
      slugify(`The view tree ${EM} Html<Msg, T>`),
      toBe(`the-view-tree-${EM}-html-msg-t`),
    ),
    check(
      slugify(`SSR ${EM} renderToString`),
      toBe(`ssr-${EM}-rendertostring`),
    ),
    check(
      slugify("The runtimes (plgg-view/client)"),
      toBe("the-runtimes-plgg-view-client"),
    ),
    check(
      slugify("What it is (and isn't)"),
      toBe("what-it-is-and-isn-t"),
    ),
    check(
      slugify(
        `Effects ${EM} compose, don't enumerate`,
      ),
      toBe(
        `effects-${EM}-compose-don-t-enumerate`,
      ),
    ),
    check(
      slugify("ICON_CONTENT"),
      toBe("icon-content"),
    ),
    check(
      slugify("NetworkError"),
      toBe("networkerror"),
    ),
  ]));

test("prefixes a leading digit with `_`", () =>
  check(
    slugify("3 little words"),
    toBe("_3-little-words"),
  ));

test("per-page dedup appends -1/-2 on collision", () => {
  const slug = makeSluggers();
  return all([
    check(slug.next("Defect"), toBe("defect")),
    check(slug.next("Defect"), toBe("defect-1")),
    check(slug.next("Defect"), toBe("defect-2")),
    // an unrelated slug is unaffected by the counter
    check(slug.next("Cause"), toBe("cause")),
  ]);
});

test("each page gets a fresh dedup counter", () => {
  const a = makeSluggers();
  const b = makeSluggers();
  return all([
    check(a.next("Defect"), toBe("defect")),
    check(b.next("Defect"), toBe("defect")),
  ]);
});
