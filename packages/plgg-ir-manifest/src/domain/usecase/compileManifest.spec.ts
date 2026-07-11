import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import {
  Option,
  pipe,
  matchResult,
  matchOption,
} from "plgg";
import {
  SemDiagnostic,
  nominalType,
  stringType,
} from "plgg-ir-language";
import {
  CompiledManifest,
  compileManifest,
} from "plgg-ir-manifest/domain/usecase/compileManifest";

/**
 * Folds an optional string to a zero-or-one array for
 * flat assertions.
 */
const optToArray = (
  o: Option<string>,
): ReadonlyArray<string> =>
  pipe(
    o,
    matchOption(
      (): ReadonlyArray<string> => [],
      (v: string): ReadonlyArray<string> => [v],
    ),
  );

/**
 * The design document's §7 example manifest,
 * verbatim in structure.
 */
const DESIGN_EXAMPLE = `
(plgg-ir 1
  (module project-management

    (entity client
      (field id
        (type client-id))

      (field name
        (type string)
        (validate
          (required)
          (length-between 1 200)))

      (relation projects
        (target project)
        (cardinality many)
        (inverse client)))

    (entity project
      (field id
        (type project-id))

      (field name
        (type string)
        (validate
          (required)
          (length-between 1 200)))

      (relation client
        (target client)
        (cardinality one)
        (required)
        (inverse projects)))))
`;

/**
 * The canonical text of a compiled source (an
 * `Err:`-prefixed code list on failure — surfaces in
 * the test diff).
 */
const canonicalOf = (source: string): string =>
  pipe(
    compileManifest(source),
    matchResult(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        `Err: ${diags.map((d) => d.code).join(", ")}`,
      (m: CompiledManifest) => m.canonical,
    ),
  );

test("the design §7 example compiles into the model", () =>
  check(
    compileManifest(DESIGN_EXAMPLE),
    okThen((m: CompiledManifest) =>
      all([
        check(
          m.module.name,
          toBe("project-management"),
        ),
        check(m.module.version, toBe(1)),
        check(
          m.module.entities.map((e) => e.name),
          toEqual(["client", "project"]),
        ),
        check(
          m.module.entities.flatMap((e) =>
            e.fields.map((f) => f.name),
          ),
          toEqual(["id", "name", "id", "name"]),
        ),
        check(
          m.module.entities
            .flatMap((e) => e.fields)
            .filter((f) => f.name === "id")
            .slice(0, 1)
            .map((f) => f.type),
          toEqual([nominalType("client-id")]),
        ),
        check(
          m.module.entities
            .flatMap((e) => e.relations)
            .map((r) => [
              r.name,
              r.target,
              r.cardinality,
              r.required,
            ]),
          toEqual([
            [
              "projects",
              "project",
              "many",
              false,
            ],
            ["client", "client", "one", true],
          ]),
        ),
        check(
          m.module.entities
            .flatMap((e) => e.fields)
            .filter((f) => f.name === "name")
            .flatMap((f) =>
              f.validations.map((v) => v.__tag),
            ),
          toEqual([
            "RequiredRule",
            "LengthBetweenRule",
            "RequiredRule",
            "LengthBetweenRule",
          ]),
        ),
      ]),
    ),
  ));

test("equivalent sources normalize to identical canonical text", () =>
  all([
    // entity order flipped + comments + whitespace
    check(
      canonicalOf(DESIGN_EXAMPLE),
      toBe(
        canonicalOf(
          "(plgg-ir 1 (module project-management (entity project (relation client (inverse projects) (required) (cardinality one) (target client)) (field name (validate (length-between 1 200) (required)) (type string)) (field id (type project-id))) ; flipped\n (entity client (relation projects (inverse client) (cardinality many) (target project)) (field name (type string) (validate (required) (length-between 1 200))) (field id (type client-id)))))",
        ),
      ),
    ),
    check(
      canonicalOf(DESIGN_EXAMPLE).startsWith(
        "(plgg-ir 1",
      ),
      toBe(true),
    ),
  ]));

test("compiling canonical output is idempotent", () =>
  check(
    canonicalOf(canonicalOf(DESIGN_EXAMPLE)),
    toBe(canonicalOf(DESIGN_EXAMPLE)),
  ));

test("the root must be versioned (plgg-ir 1 ...)", () =>
  all([
    check(
      compileManifest("(plgg-ir 2 (module m))"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual([
              "manifest.root.unsupported-version",
            ]),
          ),
      ),
    ),
    check(
      compileManifest("(plgg-ir (module m) 1)"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["manifest.root.malformed"]),
          ),
      ),
    ),
    check(
      compileManifest(""),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => [d.code, d.message]),
            toEqual([
              [
                "manifest.root.malformed",
                "a manifest source needs exactly one (plgg-ir ...) root, found 0",
              ],
            ]),
          ),
      ),
    ),
    check(
      compileManifest(
        "(plgg-ir 1 (module a)) (plgg-ir 1 (module b))",
      ),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.message),
            toEqual([
              "a manifest source needs exactly one (plgg-ir ...) root, found 2",
            ]),
          ),
      ),
    ),
    check(
      compileManifest(
        "(plgg-ir 1 (module m) (junk))",
      ),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["manifest.root.malformed"]),
          ),
      ),
    ),
  ]));

test("a module needs a name and known children", () =>
  all([
    check(
      compileManifest("(plgg-ir 1 (module))"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual([
              "manifest.module.malformed",
            ]),
          ),
      ),
    ),
    check(
      compileManifest(
        "(plgg-ir 1 (module m (view v)))",
      ),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual([
              "manifest.module.unknown-form",
            ]),
          ),
      ),
    ),
  ]));

test("unknown top-level forms and syntax errors surface", () =>
  all([
    check(
      compileManifest("(entity client)"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["language.unknown-form"]),
          ),
      ),
    ),
    check(
      compileManifest("(plgg-ir 1 (module m"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags
              .map((d) => d.code)
              .every((c) =>
                c.startsWith("syntax."),
              ),
            toBe(true),
          ),
      ),
    ),
  ]));

test("duplicate entity names are diagnosed by the declare pass", () =>
  check(
    compileManifest(
      "(plgg-ir 1 (module m (entity a) (entity a)))",
    ),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(["language.duplicate-name"]),
        ),
    ),
  ));

test("the module model records tables and columns", () =>
  check(
    compileManifest(
      "(plgg-ir 1 (module m (entity client (table clients) (field name (type string) (column client_name)))))",
    ),
    okThen((m: CompiledManifest) =>
      all([
        check(
          m.module.entities.flatMap((e) =>
            optToArray(e.table),
          ),
          toEqual(["clients"]),
        ),
        check(
          m.module.entities
            .flatMap((e) => e.fields)
            .flatMap((f) => optToArray(f.column)),
          toEqual(["client_name"]),
        ),
        check(
          m.module.entities
            .flatMap((e) => e.fields)
            .map((f) => f.type),
          toEqual([stringType]),
        ),
      ]),
    ),
  ));
