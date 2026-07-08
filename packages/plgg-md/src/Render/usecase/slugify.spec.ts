import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  slugify,
  githubSlugify,
  makeSluggers,
} from "plgg-md/Render/usecase/slugify";

/** Em-dash (U+2014) — RETAINED by the VitePress algorithm. */
const EM = "—";
/** En-dash (U+2013). */
const EN = "–";

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

// --- github-slugger parity -----------------------------
// Expected ids are the ACTUAL output of `github-slugger`
// @2.0.0's `slug()` (the fn `rehype-slug` calls, and the
// one qmu.co.jp's Astro build resolves), captured by
// running the real dependency over each heading. The
// divergent punctuation classes — ・ 、 「」 （） the
// em/en dashes, and a digit-leading heading — are all
// covered.
test("githubSlugify reproduces github-slugger ids (verified against the real dep)", () =>
  all([
    // ・ (U+30FB) deleted outright, not turned into `-`
    check(
      githubSlugify("型・関数の設計"),
      toBe("型関数の設計"),
    ),
    // 、 (U+3001) deleted
    check(
      githubSlugify("設計、実装、運用"),
      toBe("設計実装運用"),
    ),
    // 「」 (U+300C/U+300D) deleted
    check(
      githubSlugify("「引用」の扱い"),
      toBe("引用の扱い"),
    ),
    // （） (U+FF08/U+FF09) deleted
    check(
      githubSlugify("（補足）メモ"),
      toBe("補足メモ"),
    ),
    // em/en dashes deleted (NOT retained)
    check(
      githubSlugify(
        `em${EM}dash and en${EN}dash`,
      ),
      toBe("emdash-and-endash"),
    ),
    // digit-leading: NO `_` prefix
    check(
      githubSlugify("2024-07 のリリース"),
      toBe("2024-07-のリリース"),
    ),
    // ascii lowercased, spaces to `-`
    check(
      githubSlugify("Hello World"),
      toBe("hello-world"),
    ),
    check(
      githubSlugify(`A・B「C」（D）${EM}E`),
      toBe("abcde"),
    ),
  ]));

// The two sluggers MUST diverge exactly where the corpus
// depends on it — this is why the choice is injectable.
test("githubSlugify diverges from the default slugify on the corpus-critical classes", () =>
  all([
    // digit prefix: github keeps, vitepress prefixes `_`
    check(
      githubSlugify("3 little words"),
      toBe("3-little-words"),
    ),
    check(
      slugify("3 little words"),
      toBe("_3-little-words"),
    ),
    // em-dash: github deletes, vitepress retains
    check(
      githubSlugify(`a ${EM} b`),
      toBe("a--b"),
    ),
    check(
      slugify(`a ${EM} b`),
      toBe(`a-${EM}-b`),
    ),
  ]));

test("makeSluggers dedups over an injected github base", () => {
  const slug = makeSluggers(githubSlugify);
  return all([
    // ・ is dropped by the github base, then dedup applies
    check(slug.next("A・Item"), toBe("aitem")),
    check(slug.next("A・Item"), toBe("aitem-1")),
    check(slug.next("A・Item"), toBe("aitem-2")),
  ]);
});
