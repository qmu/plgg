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
  Result,
  Option,
  InvalidError,
  ok,
  err,
  some,
  none,
  pipe,
  matchResult,
  matchOption,
} from "plgg";
import {
  ListExp,
  SymbolExp,
  isSymbolExp,
} from "plgg-ir-syntax";
import {
  Dialect,
  Language,
  FormDef,
  SemDiagnostic,
  Compiled,
  semError,
  lookup,
  declaresNothing,
  compose,
  mapDialect,
  compileSource,
} from "plgg-ir-language";
import { Module } from "plgg-ir-manifest/domain/model/Module";
import { manifestDialect } from "plgg-ir-manifest/domain/usecase/manifestDialect";
import { manifestLanguage } from "plgg-ir-manifest/domain/usecase/compileManifest";

/**
 * A consumer's own node, alongside the domain's.
 */
type ViewNode = Readonly<{
  tag: "view";
  entity: string;
}>;

/**
 * The consumer's composed node type.
 */
type PortalNode = Module | ViewNode;

/**
 * Whether a composed node is the consumer's.
 */
const isViewNode = (
  node: PortalNode,
): node is ViewNode => "tag" in node;

/**
 * The symbol at `items[index]` of a form, if present.
 */
const symbolAt = (
  form: ListExp,
  index: number,
): Option<SymbolExp> =>
  form.content.items
    .slice(index, index + 1)
    .filter(isSymbolExp)
    .reduce<Option<SymbolExp>>(
      (_, s) => some(s),
      none(),
    );

/**
 * `(view <entity>)` — the consumer's form: it names a
 * domain-declared entity, so its reference must
 * resolve through the composition's scope.
 */
const viewForm: FormDef<PortalNode> = {
  name: "view",
  declare: declaresNothing,
  analyze: (form, ctx) =>
    pipe(
      symbolAt(form, 1),
      matchOption(
        (): Result<
          PortalNode,
          ReadonlyArray<SemDiagnostic>
        > =>
          err([
            semError(
              "portal.bad-view",
              "view needs (view <entity>)",
              form.content.range,
            ),
          ]),
        (name: SymbolExp) =>
          pipe(
            lookup(
              "entity",
              name.content.name,
            )(ctx.scope),
            matchOption(
              (): Result<
                PortalNode,
                ReadonlyArray<SemDiagnostic>
              > =>
                err([
                  semError(
                    "portal.unknown-entity",
                    `unknown entity ${name.content.name}`,
                    name.content.range,
                  ),
                ]),
              (): Result<
                PortalNode,
                ReadonlyArray<SemDiagnostic>
              > =>
                ok({
                  tag: "view",
                  entity: name.content.name,
                }),
            ),
          ),
      ),
    ),
};

const viewDialect: Dialect<PortalNode> = {
  name: "view",
  forms: [viewForm],
  operators: [],
  expanders: [],
  normalizers: [],
};

/**
 * The composition the request asks to make possible:
 * the domain vocabulary plus the consumer's own — no
 * `as` / `any` / `ts-ignore` anywhere in this file.
 */
const portalLanguage: Language<PortalNode> = pipe(
  compose(
    mapDialect(
      (module: Module): PortalNode => module,
    )(manifestDialect),
    viewDialect,
  ),
  matchResult(
    (): Language<PortalNode> => ({
      forms: [],
      operators: [],
      expanders: [],
      normalizers: [],
    }),
    (language: Language<PortalNode>) => language,
  ),
);

/**
 * A document using both dialects' forms: the domain
 * manifest declares `client`, the consumer's view
 * references it.
 */
const PORTAL_SOURCE = `
(plgg-ir 1
  (module shop
    (entity client
      (field id
        (type client-id)))))
(view client)
`;

test("the domain dialect composes with a consumer dialect", () =>
  check(
    compose(
      mapDialect(
        (module: Module): PortalNode => module,
      )(manifestDialect),
      viewDialect,
    ),
    okThen((language: Language<PortalNode>) =>
      check(
        language.forms.map((f) => f.name),
        toEqual(["plgg-ir", "view"]),
      ),
    ),
  ));

test("a document using both dialects' forms reads and checks", () =>
  check(
    compileSource(portalLanguage)(PORTAL_SOURCE),
    okThen((compiled: Compiled<PortalNode>) =>
      all([
        check(compiled.nodes.length, toBe(2)),
        check(
          compiled.nodes
            .filter(isViewNode)
            .map((v) => v.entity),
          toEqual(["client"]),
        ),
      ]),
    ),
  ));

test("a cross-dialect reference resolves through the composition", () =>
  // The same document with an entity the domain never
  // declared: the consumer form's reference fails —
  // so its resolution truly goes through the
  // composition's scope, not the consumer's own.
  check(
    compileSource(portalLanguage)(
      `
(plgg-ir 1
  (module shop
    (entity client
      (field id
        (type client-id)))))
(view invoice)
`,
    ),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(["portal.unknown-entity"]),
        ),
    ),
  ));

test("a name registered by two dialects is a composition error", () =>
  check(
    compose(
      mapDialect(
        (module: Module): PortalNode => module,
      )(manifestDialect),
      {
        name: "shadow",
        forms: [
          {
            name: "plgg-ir",
            declare: declaresNothing,
            analyze: (form) =>
              err([
                semError(
                  "shadow.unreachable",
                  "never analyzed",
                  form.content.range,
                ),
              ]),
          },
        ],
        operators: [],
        expanders: [],
        normalizers: [],
      },
    ),
    errThen((e: InvalidError) =>
      check(
        e.content.message,
        toBe(
          "dialect composition collides on: form plgg-ir",
        ),
      ),
    ),
  ));

test("manifestLanguage is the dialect, derived — the two cannot drift", () =>
  check(manifestLanguage, toBe(manifestDialect)));
