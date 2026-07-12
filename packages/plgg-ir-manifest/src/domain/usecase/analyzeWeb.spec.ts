import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import { SemDiagnostic } from "plgg-ir-language";
import {
  CompiledManifest,
  compileManifest,
} from "plgg-ir-manifest/domain/usecase/compileManifest";

/**
 * The §14 entity world: clients own projects and
 * invoices; projects own tasks; tasks and invoices
 * point back. The project aggregate spans project +
 * task.
 */
const WORLD = `
(entity client
  (field id (type client-id))
  (field name (type string))
  (field organization-id (type organization-id))
  (relation projects (target project) (cardinality many) (inverse client))
  (relation invoices (target invoice) (cardinality many) (inverse client)))
(entity project
  (field id (type project-id))
  (field name (type string) (validate (required) (length-between 1 200)))
  (relation client (target client) (cardinality one) (required) (inverse projects))
  (relation tasks (target task) (cardinality many) (inverse project)))
(entity task
  (field id (type task-id))
  (field name (type string))
  (relation project (target project) (cardinality one) (inverse tasks)))
(entity invoice
  (field id (type invoice-id))
  (relation client (target client) (cardinality one) (inverse invoices)))
(aggregate project-aggregate
  (root project)
  (members task)
  (consistency immediate))
`;

/**
 * The §10 policies over that world.
 */
const POLICIES = `
(policy project-reader
  (allows (= actor.organization-id project.client.organization-id)))
(policy project-name-editor
  (allows (and (= actor.organization-id project.client.organization-id)
               (has-role actor "project-manager"))))
`;

/**
 * Compiles the world plus extra module children,
 * mapping the outcome to diagnostic codes (`["ok"]`
 * on success).
 */
const codesWith = (
  extra: string,
): ReadonlyArray<string> =>
  pipe(
    compileManifest(
      `(plgg-ir 1 (module m ${WORLD} ${POLICIES} ${extra}))`,
    ),
    matchResult(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        diags.map((d) => d.code),
      (): ReadonlyArray<string> => ["ok"],
    ),
  );

/**
 * The §11 client-detail view (with the client name
 * shown and project navigation).
 */
const CLIENT_DETAIL = `
(view client-detail
  (subject (entity client) (parameter client-id))
  (query
    (one client (where (= client.id client-id)))
    (include client.projects))
  (layout
    (detail
      (show client.name)
      (section projects
        (list client.projects
          (show project.name)
          (navigate (to project-detail) (with (project-id project.id))))))))
`;

/**
 * The §11 project-detail view (authorized read, an
 * included client, and the edit action).
 */
const PROJECT_DETAIL = `
(view project-detail
  (subject (entity project) (parameter project-id))
  (query
    (one project
      (where (= project.id project-id))
      (authorized-by project-reader))
    (include project.client))
  (layout
    (detail
      (show project.name)
      (show project.client.name)
      (action edit-project-name))))
`;

/**
 * The §12 edit action with deny-by-default satisfied.
 */
const EDIT_ACTION = `
(action edit-project-name
  (subject project)
  (input
    (field name (type string) (validate (required) (length-between 1 200))))
  (authorize (policy project-name-editor))
  (effect (set project.name input.name))
  (ensure (valid project)))
`;

test("the §11/§12 views, policies, and action compile together", () =>
  check(
    codesWith(
      `${CLIENT_DETAIL} ${PROJECT_DETAIL} ${EDIT_ACTION}`,
    ),
    toEqual(["ok"]),
  ));

test("the compiled model records the web vocabulary", () =>
  check(
    pipe(
      compileManifest(
        `(plgg-ir 1 (module m ${WORLD} ${POLICIES} ${CLIENT_DETAIL} ${PROJECT_DETAIL} ${EDIT_ACTION}))`,
      ),
      matchResult(
        (): ReadonlyArray<string> => [],
        (m: CompiledManifest) => [
          ...m.module.views.map((v) => v.name),
          ...m.module.policies.map((p) => p.name),
          ...m.module.actions.map((a) => a.name),
        ],
      ),
    ),
    toEqual([
      "client-detail",
      "project-detail",
      "project-reader",
      "project-name-editor",
      "edit-project-name",
    ]),
  ));

test("§14: outside the aggregate scope the boundary diagnostic wins", () =>
  check(
    codesWith(`
(view task-detail
  (subject task)
  (scope project-aggregate)
  (query (one task) (include task.project))
  (layout
    (show task.name)
    (show task.project.name)
    (show task.project.client.invoices)))
`),
    toEqual(["manifest.view.aggregate-boundary"]),
  ));

test("§15: without a scope the not-loaded diagnostic reports available paths", () =>
  pipe(
    compileManifest(
      `(plgg-ir 1 (module m ${WORLD} ${POLICIES} (view task-detail (subject task) (query (one task) (include task.project)) (layout (show task.project.client.name)))))`,
    ),
    matchResult(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        all([
          check(
            diags.map((d) => d.code),
            toEqual([
              "manifest.view.relation-not-loaded",
            ]),
          ),
          check(
            diags
              .map((d) => d.message)
              .join("")
              .includes(
                "available: task, task.project",
              ),
            toBe(true),
          ),
        ]),
      () =>
        check("unexpected ok", toBe("an error")),
    ),
  ));

test("§15: projections expose only their fields", () =>
  all([
    check(
      codesWith(`
(projection client-summary
  (from client)
  (fields client.id client.name))
(view task-detail
  (subject task)
  (query (one task)
    (lookup client-summary (through task.project.client)))
  (layout (show client-summary.name)))
`),
      toEqual(["ok"]),
    ),
    check(
      codesWith(`
(projection client-summary
  (from client)
  (fields client.id client.name))
(view task-detail
  (subject task)
  (query (one task)
    (lookup client-summary (through task.project.client)))
  (layout (show client-summary.invoices)))
`),
      toEqual([
        "manifest.projection.not-exposed",
      ]),
    ),
    check(
      codesWith(
        "(projection bad (from ghost) (fields ghost.name))",
      ),
      toEqual(["manifest.projection.malformed"]),
    ),
    check(
      codesWith(
        "(projection bad (from client) (fields client.projects))",
      ),
      toEqual(["manifest.projection.malformed"]),
    ),
    check(
      codesWith(`
(view task-detail
  (subject task)
  (query (one task)
    (lookup ghost (through task.project)))
  (layout (show task.name)))
`),
      toEqual(["manifest.projection.unknown"]),
    ),
  ]));

test("deny-by-default: effects without authorization are rejected (§36.1)", () =>
  all([
    check(
      codesWith(`
(action rename
  (subject project)
  (input (field name (type string)))
  (effect (set project.name input.name)))
`),
      toEqual([
        "manifest.action.missing-authorize",
      ]),
    ),
    // a read-only action needs no policy
    check(
      codesWith(
        "(action inspect (subject project))",
      ),
      toEqual(["ok"]),
    ),
  ]));

test("policies must exist and must type to boolean (§16.8)", () =>
  all([
    check(
      codesWith(`
(action rename
  (subject project)
  (input (field name (type string)))
  (authorize (policy ghost))
  (effect (set project.name input.name)))
`),
      toEqual(["manifest.policy.unknown"]),
    ),
    check(
      codesWith(
        "(policy broken (allows actor.organization-id))",
      ),
      toEqual([
        "manifest.expression.non-boolean",
      ]),
    ),
    check(
      codesWith("(policy broken)"),
      toEqual(["manifest.policy.malformed"]),
    ),
    check(
      codesWith(`
(view v (subject client)
  (query (one client (authorized-by ghost)))
  (layout (show client.name)))
`),
      toEqual(["manifest.policy.unknown"]),
    ),
  ]));

test("entity access rules parse and reference declared things (§10)", () =>
  all([
    check(
      codesWith(`
(entity gadget
  (field name (type string))
  (access (read project-reader) (update name project-name-editor)))
`),
      toEqual(["ok"]),
    ),
    check(
      codesWith(`
(entity gadget
  (field name (type string))
  (access (read ghost)))
`),
      toEqual(["manifest.policy.unknown"]),
    ),
    check(
      codesWith(`
(entity gadget
  (field name (type string))
  (access (update ghost-field project-reader)))
`),
      toEqual(["manifest.entity.malformed"]),
    ),
    check(
      codesWith(`
(entity gadget
  (field name (type string))
  (access (mystery)))
`),
      toEqual(["manifest.entity.malformed"]),
    ),
  ]));

test("navigation is verified module-wide (§16.7)", () =>
  all([
    check(
      codesWith(`
(view from-view (subject client)
  (query (one client))
  (layout (navigate (to ghost-view))))
`),
      toEqual(["manifest.view.unknown"]),
    ),
    // missing parameter
    check(
      codesWith(`
${PROJECT_DETAIL} ${EDIT_ACTION}
(view from-view (subject client)
  (query (one client))
  (layout (navigate (to project-detail))))
`),
      toEqual([
        "manifest.view.missing-parameter",
      ]),
    ),
    // unknown parameter and wrong argument type
    check(
      codesWith(`
${PROJECT_DETAIL} ${EDIT_ACTION}
(view from-view (subject client)
  (query (one client))
  (layout
    (navigate (to project-detail)
      (with (project-id client.name) (mystery-param client.id)))))
`),
      toEqual([
        "language.type-mismatch",
        "manifest.view.unknown-parameter",
      ]),
    ),
  ]));

test("scalar/collection misuse is rejected (§16.7)", () =>
  all([
    check(
      codesWith(`
(view v (subject client)
  (query (one client) (include client.projects))
  (layout (show client.projects)))
`),
      toEqual([
        "manifest.view.list-scalar-misuse",
      ]),
    ),
    check(
      codesWith(`
(view v (subject client)
  (query (one client))
  (layout (list client.name (show client.name))))
`),
      toEqual([
        "manifest.view.list-scalar-misuse",
      ]),
    ),
    check(
      codesWith(`
(view v (subject client)
  (query (one client))
  (layout (mystery client.name)))
`),
      toEqual([
        "manifest.view.unknown-layout-form",
      ]),
    ),
  ]));

test("view structure is closed and consistent", () =>
  all([
    check(
      codesWith("(view v)"),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(
        "(view v (subject ghost) (query (one ghost)) (layout))",
      ),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(
        "(view v (subject client) (query (one project)) (layout))",
      ),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(
        "(view v (subject client) (layout))",
      ),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(
        "(view v (subject client) (query (one client)) (layout) (scope ghost))",
      ),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(
        "(view v (subject client) (query (one client)) (layout (show client.ghost)))",
      ),
      toEqual(["manifest.path.unknown"]),
    ),
  ]));

test("effects target direct subject fields with matching types (§12)", () =>
  all([
    check(
      codesWith(`
(action a (subject project)
  (authorize (policy project-reader))
  (effect (set project.client input.name))
  (input (field name (type string))))
`),
      toEqual(["manifest.action.bad-effect"]),
    ),
    check(
      codesWith(`
(action a (subject project)
  (authorize (policy project-reader))
  (input (field count (type integer)))
  (effect (set project.name input.count)))
`),
      toEqual(["language.type-mismatch"]),
    ),
    check(
      codesWith(`
(action a (subject project)
  (authorize (policy project-reader))
  (input (field name (type string)))
  (effect (set input.name project.name)))
`),
      toEqual(["manifest.action.bad-effect"]),
    ),
    check(
      codesWith("(action a (subject ghost))"),
      toEqual(["manifest.action.malformed"]),
    ),
    check(
      codesWith(`
(action a (subject project)
  (authorize (policy project-reader))
  (ensure (valid client)))
`),
      toEqual(["manifest.action.malformed"]),
    ),
    check(
      codesWith(`
(action a (subject project)
  (ensure (= project.name "x")))
`),
      toEqual(["ok"]),
    ),
  ]));

test("malformed web clauses each get their diagnostic", () =>
  all([
    check(
      codesWith("(action)"),
      toEqual(["manifest.action.malformed"]),
    ),
    check(
      codesWith(
        "(action a (subject project) (ensure))",
      ),
      toEqual(["manifest.action.malformed"]),
    ),
    check(
      codesWith(
        "(action a (subject project) (ensure (valid)))",
      ),
      toEqual(["manifest.action.malformed"]),
    ),
    check(
      codesWith(`
(action a (subject project)
  (authorize (policy project-reader))
  (effect (mystery)))
`),
      toEqual(["manifest.action.bad-effect"]),
    ),
    check(
      codesWith(`
(action a (subject project)
  (authorize (policy project-reader))
  (effect (set)))
`),
      toEqual(["manifest.action.bad-effect"]),
    ),
    check(
      codesWith(`
(action a (subject project)
  (authorize (policy project-reader))
  (effect (set project.name)))
`),
      toEqual(["manifest.action.bad-effect"]),
    ),
    check(
      codesWith("(projection)"),
      toEqual(["manifest.projection.malformed"]),
    ),
    check(
      codesWith(`
(view v (subject client)
  (query (one client))
  (layout (section)))
`),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(`
(view v (subject client)
  (query (one client))
  (layout (show)))
`),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(`
(view v (subject client)
  (query (one client))
  (layout (list)))
`),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(`
(view v (subject client)
  (query (one client))
  (layout (action)))
`),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(`
(view v (subject client)
  (query (one client))
  (layout (navigate)))
`),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(`
${PROJECT_DETAIL} ${EDIT_ACTION}
(view v (subject client)
  (query (one client))
  (layout (navigate (to project-detail) (with x))))
`),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(`
(view v (subject client)
  (query (include client.projects)))
`),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(`
(view v (subject client)
  (query (one))
  (layout))
`),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(`
(view v (subject client)
  (query (one client) (include client.name))
  (layout (show client.name)))
`),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(`
(projection client-summary (from client) (fields client.name))
(view v (subject client)
  (query (one client) (lookup client-summary))
  (layout (show client.name)))
`),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(`
(projection task-summary (from task) (fields task.name))
(view v (subject task)
  (query (one task) (lookup task-summary (through task.project)))
  (layout (show task.name)))
`),
      toEqual(["manifest.view.malformed"]),
    ),
    check(
      codesWith(`
(projection nothing (from project) (fields))
(view v (subject client)
  (query (one client) (lookup nothing (through client.projects)))
  (layout (show client.name)))
`),
      toEqual(["ok"]),
    ),
  ]));

test("inside the declared boundary an unloaded hop is still not-loaded", () =>
  check(
    codesWith(`
(view task-detail
  (subject task)
  (scope project-aggregate)
  (query (one task))
  (layout (show task.project.name)))
`),
    toEqual([
      "manifest.view.relation-not-loaded",
    ]),
  ));

test("subject long-form parameters and layout order are preserved", () =>
  check(
    pipe(
      compileManifest(
        `(plgg-ir 1 (module m ${WORLD} ${POLICIES} (view v (subject (entity client) (parameter client-id)) (query (one client)) (layout (show client.name) (show client.id)))))`,
      ),
      matchResult(
        (): string => "err",
        (m: CompiledManifest) =>
          m.module.views
            .flatMap((v) => v.layout)
            .map((n) => n.__tag)
            .join(","),
      ),
    ),
    toBe("ShowNode,ShowNode"),
  ));
