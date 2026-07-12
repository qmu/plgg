import {
  SoftStr,
  Result,
  Option,
  ok,
  err,
  some,
  none,
  pipe,
  matchOption,
  chainResult,
  mapResult,
} from "plgg";
import {
  Sexp,
  ListExp,
  SymbolExp,
  isListExp,
  isSymbolExp,
  sexpRange,
  sourcePos,
  sourceRange,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  TypedExpr,
  AnalysisContext,
  Scope,
  Binding,
  rootScope,
  binding,
  nominalType,
  semError,
  allOrErrors,
} from "plgg-ir-language";
import {
  codeBadView,
  codeUnknownProjection,
  codeUnknownLayoutForm,
  codePathNotLoaded,
  codeAggregateBoundary,
  codeListScalarMisuse,
} from "plgg-ir-manifest/domain/model/ManifestCode";
import {
  Query,
  Lookup,
  query,
  View,
  view,
  LayoutNode,
  detailNode,
  sectionNode,
  listNode,
  showNode,
  actionRefNode,
  navigateNode,
  NavigateArg,
} from "plgg-ir-manifest/domain/model/View";
import {
  PathRoot,
  ResolvedPath,
  entityRoot,
  projectionRoot,
  isValueTerminal,
  isEntityTerminal,
} from "plgg-ir-manifest/domain/model/Path";
import {
  Module,
  entityOf,
  projectionOf,
} from "plgg-ir-manifest/domain/model/Module";
import {
  hasHead,
  clausesNamed,
  childrenOf,
  symbolArg,
} from "plgg-ir-manifest/domain/usecase/clause";
import { resolvePath } from "plgg-ir-manifest/domain/usecase/resolvePath";
import {
  onlyOf,
  checkPathCondition,
  symbolArgsOf,
  exprArgsOf,
} from "plgg-ir-manifest/domain/usecase/analyzeWeb";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * A view's parsed subject declaration.
 */
type SubjectDecl = Readonly<{
  entity: SoftStr;
  parameters: ReadonlyArray<SoftStr>;
}>;

/**
 * What the layout walk carries: the path roots in
 * scope, the loaded prefix set (design.md §15), and
 * the aggregate boundary entities when the view
 * declared a scope (design.md §14).
 */
type LayoutEnv = Readonly<{
  roots: ReadonlyArray<PathRoot>;
  loaded: ReadonlyArray<SoftStr>;
  boundary: Option<ReadonlyArray<SoftStr>>;
}>;

/**
 * The design §35 example diagnostic: the path is not
 * in the query scope, with the available paths
 * listed.
 */
const notLoadedDiag = (
  env: LayoutEnv,
  p: ResolvedPath,
): SemDiagnostic =>
  semError(
    codePathNotLoaded,
    `the relation path ${JSON.stringify(p.text)} is not available in the query scope; available: ${env.loaded.join(", ")}`,
    p.range,
  );

/**
 * Verifies one path against the view's query scope
 * (design.md §14–15): every crossed relation prefix
 * must be loaded. When a scope aggregate is declared
 * and the first unloaded hop leaves it, the boundary
 * diagnostic wins over the not-loaded one — the
 * layered §14 answer.
 */
const scopeCheck =
  (env: LayoutEnv) =>
  (p: ResolvedPath): Diags =>
    p.prefixes
      .filter(
        (prefix) =>
          !env.loaded.includes(prefix.text),
      )
      .slice(0, 1)
      .flatMap((prefix) =>
        pipe(
          env.boundary,
          matchOption(
            (): Diags => [notLoadedDiag(env, p)],
            (
              boundary: ReadonlyArray<SoftStr>,
            ): Diags =>
              boundary.includes(prefix.entity)
                ? [notLoadedDiag(env, p)]
                : [
                    semError(
                      codeAggregateBoundary,
                      `the path ${JSON.stringify(p.text)} crosses the aggregate boundary at ${JSON.stringify(prefix.text)}`,
                      p.range,
                    ),
                  ],
          ),
        ),
      );

/**
 * Resolves a layout path argument (a dotted or bare
 * symbol) with the environment's roots, then applies
 * the scope check.
 */
const layoutPath = (
  m: Module,
  env: LayoutEnv,
  exp: Sexp,
): Result<ResolvedPath, Diags> =>
  !isSymbolExp(exp)
    ? err([
        semError(
          codeBadView,
          "a layout path must be a symbol",
          sexpRange(exp),
        ),
      ])
    : pipe(
        resolvePath(m, env.roots)(
          exp.content.name,
          exp.content.range,
        ),
        chainResult(
          (
            p: ResolvedPath,
          ): Result<ResolvedPath, Diags> =>
            pipe(scopeCheck(env)(p), (diags) =>
              diags.length === 0
                ? ok(p)
                : err(diags),
            ),
        ),
      );

/**
 * Walks one layout child (design.md §11): a closed
 * vocabulary — `detail`, `section`, `list`, `show`,
 * `action`, `navigate` — with scalar/collection rules
 * (design.md §16.7) and scope checks on every path.
 * Child order is meaning and is preserved.
 */
const walkLayout =
  (
    m: Module,
    ctx: AnalysisContext<Module>,
    env: LayoutEnv,
  ) =>
  (exp: Sexp): Result<LayoutNode, Diags> =>
    !isListExp(exp)
      ? err([unknownLayout(exp)])
      : hasHead("detail")(exp)
        ? walkChildren(
            m,
            ctx,
            env,
            exp,
            1,
            (children) =>
              detailNode(
                children,
                exp.content.range,
              ),
          )
        : hasHead("section")(exp)
          ? walkSection(m, ctx, env)(exp)
          : hasHead("show")(exp)
            ? walkShow(m, env)(exp)
            : hasHead("list")(exp)
              ? walkList(m, ctx, env)(exp)
              : hasHead("action")(exp)
                ? walkActionRef(exp)
                : hasHead("navigate")(exp)
                  ? walkNavigate(m, env)(exp)
                  : err([unknownLayout(exp)]);

/**
 * The closed-vocabulary layout diagnostic.
 */
const unknownLayout = (
  exp: Sexp,
): SemDiagnostic =>
  semError(
    codeUnknownLayoutForm,
    "a layout child must be (detail ...), (section ...), (list ...), (show ...), (action ...), or (navigate ...)",
    sexpRange(exp),
  );

/**
 * Walks a form's children from `skip` and wraps them.
 */
const walkChildren = (
  m: Module,
  ctx: AnalysisContext<Module>,
  env: LayoutEnv,
  exp: ListExp,
  skip: number,
  build: (
    children: ReadonlyArray<LayoutNode>,
  ) => LayoutNode,
): Result<LayoutNode, Diags> =>
  pipe(
    allOrErrors(
      childrenOf(exp)
        .slice(skip - 1)
        .map(walkLayout(m, ctx, env)),
    ),
    mapResult(build),
  );

/**
 * `(section <name> <children>...)`.
 */
const walkSection =
  (
    m: Module,
    ctx: AnalysisContext<Module>,
    env: LayoutEnv,
  ) =>
  (exp: ListExp): Result<LayoutNode, Diags> =>
    pipe(
      symbolArg(exp, 1),
      matchOption(
        (): Result<LayoutNode, Diags> =>
          err([
            semError(
              codeBadView,
              "a section needs (section <name> ...)",
              exp.content.range,
            ),
          ]),
        (name: SymbolExp) =>
          walkChildren(
            m,
            ctx,
            env,
            exp,
            2,
            (children) =>
              sectionNode(
                name.content.name,
                children,
                exp.content.range,
              ),
          ),
      ),
    );

/**
 * `(show <value-path>)` — a scalar value only.
 */
const walkShow =
  (m: Module, env: LayoutEnv) =>
  (exp: ListExp): Result<LayoutNode, Diags> =>
    pipe(
      childrenOf(exp)
        .slice(0, 1)
        .map((arg) => layoutPath(m, env, arg))
        .reduce<Result<ResolvedPath, Diags>>(
          (_, r) => r,
          err([
            semError(
              codeBadView,
              "(show ...) needs a value path",
              exp.content.range,
            ),
          ]),
        ),
      chainResult(
        (
          p: ResolvedPath,
        ): Result<LayoutNode, Diags> =>
          !isValueTerminal(p.terminal) ||
          p.throughMany
            ? err([
                semError(
                  codeListScalarMisuse,
                  `(show ...) needs a scalar value path but ${JSON.stringify(p.text)} is ${p.throughMany ? "a collection" : "an entity"}`,
                  p.range,
                ),
              ])
            : ok(showNode(p, exp.content.range)),
      ),
    );

/**
 * `(list <collection-path> <children>...)` — the
 * children walk rooted at the element entity's alias
 * (design.md §11).
 */
const walkList =
  (
    m: Module,
    ctx: AnalysisContext<Module>,
    env: LayoutEnv,
  ) =>
  (exp: ListExp): Result<LayoutNode, Diags> =>
    pipe(
      childrenOf(exp)
        .slice(0, 1)
        .map((arg) => layoutPath(m, env, arg))
        .reduce<Result<ResolvedPath, Diags>>(
          (_, r) => r,
          err([
            semError(
              codeBadView,
              "(list ...) needs a collection path",
              exp.content.range,
            ),
          ]),
        ),
      chainResult(
        (
          p: ResolvedPath,
        ): Result<LayoutNode, Diags> =>
          !isEntityTerminal(p.terminal) ||
          !p.throughMany
            ? err([
                semError(
                  codeListScalarMisuse,
                  `(list ...) needs a collection path but ${JSON.stringify(p.text)} is not one`,
                  p.range,
                ),
              ])
            : pipe(
                elementEntityOf(p),
                (element: SoftStr) =>
                  walkChildren(
                    m,
                    ctx,
                    {
                      roots: [
                        ...env.roots,
                        entityRoot(
                          element,
                          element,
                        ),
                      ],
                      loaded: [
                        ...env.loaded,
                        element,
                      ],
                      boundary: env.boundary,
                    },
                    exp,
                    2,
                    (children) =>
                      listNode(
                        p,
                        children,
                        exp.content.range,
                      ),
                  ),
              ),
      ),
    );

/**
 * The element entity of a verified collection path.
 */
const elementEntityOf = (
  p: ResolvedPath,
): SoftStr =>
  isEntityTerminal(p.terminal)
    ? p.terminal.content.entity
    : "";

/**
 * The target entity of a verified entity path.
 */
const targetOf = (p: ResolvedPath): SoftStr =>
  elementEntityOf(p);

/**
 * `(action <name>)` — existence is verified
 * module-wide (actions may be declared later).
 */
const walkActionRef = (
  exp: ListExp,
): Result<LayoutNode, Diags> =>
  pipe(
    symbolArg(exp, 1),
    matchOption(
      (): Result<LayoutNode, Diags> =>
        err([
          semError(
            codeBadView,
            "(action ...) needs an action name",
            exp.content.range,
          ),
        ]),
      (name: SymbolExp) =>
        ok(
          actionRefNode(
            name.content.name,
            exp.content.range,
          ),
        ),
    ),
  );

/**
 * `(navigate (to <view>) (with (<param> <path>)...))`
 * — target existence and parameter completeness are
 * verified module-wide (views navigate forward).
 */
const walkNavigate =
  (m: Module, env: LayoutEnv) =>
  (exp: ListExp): Result<LayoutNode, Diags> =>
    pipe(symbolArgsOf(exp, "to"), (tos) =>
      tos.length !== 1
        ? err([
            semError(
              codeBadView,
              "(navigate ...) needs exactly one (to <view>)",
              exp.content.range,
            ),
          ])
        : pipe(
            allOrErrors(
              clausesNamed(exp, "with")
                .flatMap(childrenOf)
                .map((pair) =>
                  navigateArgOf(m, env, pair),
                ),
            ),
            mapResult(
              (
                args: ReadonlyArray<NavigateArg>,
              ): LayoutNode =>
                navigateNode(
                  onlyOf(
                    tos.map(
                      (t) => t.content.name,
                    ),
                    "",
                  ),
                  args,
                  exp.content.range,
                ),
            ),
          ),
    );

/**
 * Parses one `(<parameter> <path>)` navigation pair.
 */
const navigateArgOf = (
  m: Module,
  env: LayoutEnv,
  pair: Sexp,
): Result<NavigateArg, Diags> =>
  !isListExp(pair) ||
  pair.content.items.length !== 2 ||
  !pair.content.items
    .slice(0, 1)
    .every(isSymbolExp)
    ? err([
        semError(
          codeBadView,
          "(with ...) takes (<parameter> <path>) pairs",
          sexpRange(pair),
        ),
      ])
    : pipe(
        pair.content.items
          .slice(1)
          .map((v) => layoutPath(m, env, v))
          .reduce<Result<ResolvedPath, Diags>>(
            (_, r) => r,
            err([
              semError(
                codeBadView,
                "(with ...) takes (<parameter> <path>) pairs",
                sexpRange(pair),
              ),
            ]),
          ),
        mapResult(
          (p: ResolvedPath): NavigateArg => ({
            parameter: onlyOf(
              pair.content.items
                .slice(0, 1)
                .filter(isSymbolExp)
                .map((s) => s.content.name),
              "",
            ),
            value: p,
            range: pair.content.range,
          }),
        ),
      );

/**
 * Parses the view subject: `(subject <entity>)` or
 * `(subject (entity <e>) (parameter <p>)*)`. A
 * parameter named `p` carries the nominal type `p`
 * (the same convention as `actor.<f>`).
 */
const subjectOf = (
  m: Module,
  form: ListExp,
): Result<SubjectDecl, Diags> =>
  pipe(
    clausesNamed(form, "subject"),
    (subjects) =>
      subjects.length !== 1
        ? err([
            semError(
              codeBadView,
              "a view needs exactly one (subject ...)",
              form.content.range,
            ),
          ])
        : pipe(
            subjects.map((s): SubjectDecl =>
              pipe(
                symbolArg(s, 1),
                matchOption(
                  (): SubjectDecl => ({
                    entity: symbolArgsOf(
                      s,
                      "entity",
                    )
                      .map((e) => e.content.name)
                      .join(""),
                    parameters: symbolArgsOf(
                      s,
                      "parameter",
                    ).map((p) => p.content.name),
                  }),
                  (
                    entity: SymbolExp,
                  ): SubjectDecl => ({
                    entity: entity.content.name,
                    parameters: [],
                  }),
                ),
              ),
            ),
            (decls) =>
              decls.every(
                (d) =>
                  entityOf(m, d.entity).length >
                  0,
              )
                ? ok(
                    onlyOf(decls, {
                      entity: "",
                      parameters: [],
                    }),
                  )
                : err([
                    semError(
                      codeBadView,
                      "view subject is not a declared entity",
                      form.content.range,
                    ),
                  ]),
          ),
  );

/**
 * Resolves the view's `(scope <aggregate>)` into the
 * aggregate name and its boundary entities.
 */
const scopeOf = (
  m: Module,
  form: ListExp,
): Result<
  Option<
    Readonly<{
      name: SoftStr;
      entities: ReadonlyArray<SoftStr>;
    }>
  >,
  Diags
> =>
  pipe(symbolArgsOf(form, "scope"), (scopes) =>
    scopes.length === 0
      ? ok(none())
      : pipe(
          m.aggregates.filter((a) =>
            scopes.some(
              (s) => a.name === s.content.name,
            ),
          ),
          (matched) =>
            matched.length === 0
              ? err([
                  semError(
                    codeBadView,
                    "view scope is not a declared aggregate",
                    form.content.range,
                  ),
                ])
              : ok(
                  some({
                    name: onlyOf(
                      matched.map((a) => a.name),
                      "",
                    ),
                    entities: matched.flatMap(
                      (a) => [
                        a.root,
                        ...a.members,
                      ],
                    ),
                  }),
                ),
        ),
  );

/**
 * Parses the view's `(query (one <subject-entity>
 * [(where <cond>)] [(authorized-by <policy>)])
 * (include <path>)* (lookup <projection>
 * (through <path>))*)` (design.md §11, §15).
 */
const parseQuery = (
  m: Module,
  ctx: AnalysisContext<Module>,
  subject: SubjectDecl,
  q: ListExp,
): Result<Query, Diags> =>
  pipe(
    childrenOf(q).filter((c) =>
      isListExp(c) ? hasHead("one")(c) : false,
    ),
    (ones) =>
      ones.filter(isListExp).length !== 1
        ? err([
            semError(
              codeBadView,
              "a query needs exactly one (one <entity> ...)",
              q.content.range,
            ),
          ])
        : ones
            .filter(isListExp)
            .map((one) =>
              parseOne(m, ctx, subject, q, one),
            )
            .reduce<Result<Query, Diags>>(
              (_, r) => r,
              err([
                semError(
                  codeBadView,
                  "a query needs exactly one (one <entity> ...)",
                  q.content.range,
                ),
              ]),
            ),
  );

/**
 * Parses the `(one ...)` loader plus the query's
 * includes and lookups.
 */
const parseOne = (
  m: Module,
  ctx: AnalysisContext<Module>,
  subject: SubjectDecl,
  q: ListExp,
  one: ListExp,
): Result<Query, Diags> =>
  pipe(
    symbolArg(one, 1),
    matchOption(
      (): Result<Query, Diags> =>
        err([
          semError(
            codeBadView,
            "(one ...) needs the subject entity",
            one.content.range,
          ),
        ]),
      (loaded: SymbolExp) =>
        loaded.content.name !== subject.entity
          ? err([
              semError(
                codeBadView,
                `(one ${loaded.content.name}) must load the view subject ${JSON.stringify(subject.entity)}`,
                loaded.content.range,
              ),
            ])
          : pipe(
              allOrErrors(
                exprArgsOf(one, "where").map(
                  (cond) =>
                    checkPathCondition(
                      m,
                      ctx,
                      [
                        entityRoot(
                          subject.entity,
                          subject.entity,
                        ),
                      ],
                      parameterScope(subject),
                      cond,
                    ),
                ),
              ),
              chainResult(
                (
                  wheres: ReadonlyArray<TypedExpr>,
                ) =>
                  pipe(
                    allOrErrors(
                      symbolArgsOf(
                        q,
                        "include",
                      ).map((inc) =>
                        includeOf(
                          m,
                          subject,
                          inc,
                        ),
                      ),
                    ),
                    chainResult(
                      (
                        includes: ReadonlyArray<ResolvedPath>,
                      ) =>
                        pipe(
                          allOrErrors(
                            clausesNamed(
                              q,
                              "lookup",
                            ).map((l) =>
                              lookupOf(
                                m,
                                subject,
                                l,
                              ),
                            ),
                          ),
                          mapResult(
                            (
                              lookups: ReadonlyArray<Lookup>,
                            ): Query =>
                              query(
                                subject.entity,
                                wheres
                                  .slice(0, 1)
                                  .reduce<
                                    Option<TypedExpr>
                                  >(
                                    (_, w) =>
                                      some(w),
                                    none(),
                                  ),
                                symbolArgsOf(
                                  one,
                                  "authorized-by",
                                )
                                  .map(
                                    (s) =>
                                      s.content
                                        .name,
                                  )
                                  .reduce<
                                    Option<SoftStr>
                                  >(
                                    (_, n) =>
                                      some(n),
                                    none(),
                                  ),
                                includes,
                                lookups,
                              ),
                          ),
                        ),
                    ),
                  ),
              ),
            ),
    ),
  );

/**
 * The scope holding a view's typed parameters.
 */
const parameterScope = (
  subject: SubjectDecl,
): Scope =>
  rootScope(
    subject.parameters.map((p): Binding =>
      binding(
        "parameter",
        p,
        some(nominalType(p)),
        sourceRange(
          sourcePos(0, 1, 1),
          sourcePos(0, 1, 1),
        ),
      ),
    ),
  );

/**
 * Resolves one `(include <path>)`: it must load
 * relations from the subject (design.md §15).
 */
const includeOf = (
  m: Module,
  subject: SubjectDecl,
  inc: SymbolExp,
): Result<ResolvedPath, Diags> =>
  pipe(
    resolvePath(m, [
      entityRoot(subject.entity, subject.entity),
    ])(inc.content.name, inc.content.range),
    chainResult(
      (
        p: ResolvedPath,
      ): Result<ResolvedPath, Diags> =>
        isEntityTerminal(p.terminal) &&
        p.prefixes.length > 0
          ? ok(p)
          : err([
              semError(
                codeBadView,
                `(include ...) must load a relation path, not ${JSON.stringify(p.text)}`,
                p.range,
              ),
            ]),
    ),
  );

/**
 * Resolves one `(lookup <projection>
 * (through <path>))` — the through-path is the
 * deliberate boundary crossing and must reach the
 * projection's source entity (design.md §15).
 */
const lookupOf = (
  m: Module,
  subject: SubjectDecl,
  l: ListExp,
): Result<Lookup, Diags> =>
  pipe(
    symbolArg(l, 1),
    matchOption(
      (): Result<Lookup, Diags> =>
        err([
          semError(
            codeBadView,
            "(lookup ...) needs a projection name",
            l.content.range,
          ),
        ]),
      (name: SymbolExp) =>
        projectionOf(m, name.content.name)
          .length === 0
          ? err([
              semError(
                codeUnknownProjection,
                `unknown projection ${JSON.stringify(name.content.name)}`,
                name.content.range,
              ),
            ])
          : pipe(
              symbolArgsOf(l, "through"),
              (throughs) =>
                throughs.length !== 1
                  ? err([
                      semError(
                        codeBadView,
                        "(lookup ...) needs exactly one (through <path>)",
                        l.content.range,
                      ),
                    ])
                  : pipe(
                      allOrErrors(
                        throughs.map((t) =>
                          resolvePath(m, [
                            entityRoot(
                              subject.entity,
                              subject.entity,
                            ),
                          ])(
                            t.content.name,
                            t.content.range,
                          ),
                        ),
                      ),
                      chainResult(
                        (
                          resolved: ReadonlyArray<ResolvedPath>,
                        ): Result<
                          Lookup,
                          Diags
                        > =>
                          resolved.every(
                            (p) =>
                              isEntityTerminal(
                                p.terminal,
                              ) &&
                              projectionOf(
                                m,
                                name.content.name,
                              ).every(
                                (proj) =>
                                  targetOf(p) ===
                                  proj.from,
                              ),
                          )
                            ? resolved
                                .map(
                                  (
                                    p,
                                  ): Result<
                                    Lookup,
                                    Diags
                                  > =>
                                    ok({
                                      projection:
                                        name
                                          .content
                                          .name,
                                      through: p,
                                      range:
                                        l.content
                                          .range,
                                    }),
                                )
                                .reduce<
                                  Result<
                                    Lookup,
                                    Diags
                                  >
                                >(
                                  (_, r) => r,
                                  err([
                                    semError(
                                      codeBadView,
                                      "(lookup ...) needs exactly one (through <path>)",
                                      l.content
                                        .range,
                                    ),
                                  ]),
                                )
                            : err([
                                semError(
                                  codeBadView,
                                  "(through ...) must reach the projection's source entity",
                                  l.content.range,
                                ),
                              ]),
                      ),
                    ),
            ),
    ),
  );

/**
 * Parses `(view <name> (subject ...)
 * [(scope <aggregate>)] (query ...) (layout ...))`
 * (design.md §11, §14).
 */
export const parseView =
  (m: Module, ctx: AnalysisContext<Module>) =>
  (form: ListExp): Result<View, Diags> =>
    pipe(
      symbolArg(form, 1),
      matchOption(
        (): Result<View, Diags> =>
          err([
            semError(
              codeBadView,
              "a view needs (view <name> ...)",
              form.content.range,
            ),
          ]),
        (name: SymbolExp) =>
          pipe(
            subjectOf(m, form),
            chainResult((subject: SubjectDecl) =>
              pipe(
                scopeOf(m, form),
                chainResult((scope) =>
                  buildView(
                    m,
                    ctx,
                    form,
                    name,
                    subject,
                    scope,
                  ),
                ),
              ),
            ),
          ),
      ),
    );

/**
 * Builds the view: the query first (it defines the
 * loaded set), then the layout walked in that scope.
 */
const buildView = (
  m: Module,
  ctx: AnalysisContext<Module>,
  form: ListExp,
  name: SymbolExp,
  subject: SubjectDecl,
  scope: Option<
    Readonly<{
      name: SoftStr;
      entities: ReadonlyArray<SoftStr>;
    }>
  >,
): Result<View, Diags> =>
  pipe(clausesNamed(form, "query"), (queries) =>
    queries.length !== 1
      ? err([
          semError(
            codeBadView,
            "a view needs exactly one (query ...)",
            form.content.range,
          ),
        ])
      : pipe(
          queries
            .map((q) =>
              parseQuery(m, ctx, subject, q),
            )
            .reduce<Result<Query, Diags>>(
              (_, r) => r,
              err([
                semError(
                  codeBadView,
                  "a view needs exactly one (query ...)",
                  form.content.range,
                ),
              ]),
            ),
          chainResult((q: Query) =>
            pipe(
              layoutEnvOf(m, subject, q, scope),
              (env: LayoutEnv) =>
                pipe(
                  clausesNamed(form, "layout"),
                  (layouts) =>
                    layouts.length !== 1
                      ? err([
                          semError(
                            codeBadView,
                            "a view needs exactly one (layout ...)",
                            form.content.range,
                          ),
                        ])
                      : pipe(
                          allOrErrors(
                            layouts
                              .flatMap(childrenOf)
                              .map(
                                walkLayout(
                                  m,
                                  ctx,
                                  env,
                                ),
                              ),
                          ),
                          mapResult(
                            (
                              layout: ReadonlyArray<LayoutNode>,
                            ): View =>
                              view(
                                name.content.name,
                                subject.entity,
                                subject.parameters,
                                pipe(
                                  scope,
                                  matchOption(
                                    (): Option<SoftStr> =>
                                      none(),
                                    (s) =>
                                      some(
                                        s.name,
                                      ),
                                  ),
                                ),
                                q,
                                layout,
                                form.content
                                  .range,
                              ),
                          ),
                        ),
                ),
            ),
          ),
        ),
  );

/**
 * The layout environment a view's query grants
 * (design.md §15): the subject root, every include
 * prefix, and the lookup projection aliases.
 */
const layoutEnvOf = (
  m: Module,
  subject: SubjectDecl,
  q: Query,
  scope: Option<
    Readonly<{
      name: SoftStr;
      entities: ReadonlyArray<SoftStr>;
    }>
  >,
): LayoutEnv => ({
  roots: [
    entityRoot(subject.entity, subject.entity),
    ...q.lookups.flatMap((l) =>
      projectionOf(m, l.projection).map((p) =>
        projectionRoot(l.projection, p),
      ),
    ),
  ],
  loaded: [
    subject.entity,
    ...q.includes.flatMap((p) =>
      p.prefixes.map((prefix) => prefix.text),
    ),
  ],
  boundary: pipe(
    scope,
    matchOption(
      (): Option<ReadonlyArray<SoftStr>> =>
        none(),
      (s) => some(s.entities),
    ),
  ),
});
