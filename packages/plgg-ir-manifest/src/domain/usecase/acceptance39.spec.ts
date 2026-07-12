import {
  test,
  check,
  toBe,
  toEqual,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import { SemDiagnostic } from "plgg-ir-language";
import { fieldRef } from "plgg-ir-manifest/domain/model";
import { updatePlanFor } from "plgg-ir-manifest/domain/usecase/verifyDependencies";
import {
  CompiledManifest,
  compileManifest,
} from "plgg-ir-manifest/domain/usecase/compileManifest";

/**
 * The design §39 acceptance scenario, whole: clients,
 * projects, tasks, invoices; policies; the project
 * aggregate; a derived task count; the three views;
 * the guarded edit action.
 */
const SCENARIO = `
(plgg-ir 1
  (module project-management

    (entity client
      (field id (type client-id))
      (field name (type string) (validate (required) (length-between 1 200)))
      (field organization-id (type organization-id))
      (relation projects (target project) (cardinality many) (inverse client))
      (relation invoices (target invoice) (cardinality many) (inverse client)))

    (entity project
      (field id (type project-id))
      (field name (type string) (validate (required) (length-between 1 200)))
      (field task-count (type integer)
        (derive (count project.tasks))
        (materialize (consistency immediate)))
      (relation client (target client) (cardinality one) (required) (inverse projects))
      (relation tasks (target task) (cardinality many) (inverse project))
      (access (read project-reader) (update name project-name-editor)))

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

    (policy project-reader
      (allows (= actor.organization-id project.client.organization-id)))

    (policy project-name-editor
      (allows (and (= actor.organization-id project.client.organization-id)
                   (has-role actor "project-manager"))))

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

    (view task-detail
      (subject (entity task) (parameter task-id))
      (scope project-aggregate)
      (query
        (one task (where (= task.id task-id)))
        (include task.project))
      (layout
        (detail
          (show task.name)
          (show task.project.name))))

    (action edit-project-name
      (subject project)
      (input
        (field name (type string) (validate (required) (length-between 1 200))))
      (authorize (policy project-name-editor))
      (effect (set project.name input.name))
      (ensure (valid project)))))
`;

test("§39: the whole scenario compiles into the canonical IR", () =>
  check(
    pipe(
      compileManifest(SCENARIO),
      matchResult(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          diags.map((d) => d.code).join(","),
        (m: CompiledManifest) =>
          [
            m.module.name,
            String(m.module.entities.length),
            String(m.module.views.length),
            String(m.module.policies.length),
            String(m.module.actions.length),
            m.canonical.startsWith("(plgg-ir 1")
              ? "versioned"
              : "unversioned",
          ].join(","),
      ),
    ),
    toBe("project-management,4,3,2,1,versioned"),
  ));

test("§39: compiling the canonical output is a fixpoint", () =>
  check(
    pipe(
      compileManifest(SCENARIO),
      matchResult(
        (): string => "first-failed",
        (first: CompiledManifest) =>
          pipe(
            compileManifest(first.canonical),
            matchResult(
              (): string => "second-failed",
              (second: CompiledManifest) =>
                second.canonical ===
                first.canonical
                  ? "fixpoint"
                  : "diverged",
            ),
          ),
      ),
    ),
    toBe("fixpoint"),
  ));

test("§39: an edit without a policy is rejected (deny-by-default)", () =>
  check(
    pipe(
      compileManifest(
        SCENARIO.replace(
          "(authorize (policy project-name-editor))",
          "",
        ),
      ),
      matchResult(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          diags.map((d) => d.code),
        (): ReadonlyArray<string> => ["ok"],
      ),
    ),
    // the rejected action also drops out of the
    // module, so the view's layout reference to it
    // is reported too — everything in one run (§35)
    toEqual([
      "manifest.action.missing-authorize",
      "manifest.action.unknown",
    ]),
  ));

test("§39: task-detail cannot reach client invoices across the aggregate", () =>
  check(
    pipe(
      compileManifest(
        SCENARIO.replace(
          "(show task.project.name)",
          "(show task.project.name)\n          (show task.project.client.invoices)",
        ),
      ),
      matchResult(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          diags.map((d) => d.code),
        (): ReadonlyArray<string> => ["ok"],
      ),
    ),
    toEqual(["manifest.view.aggregate-boundary"]),
  ));

test("§39: a task change replans the project's derived count", () =>
  check(
    pipe(
      compileManifest(SCENARIO),
      matchResult(
        (): ReadonlyArray<string> => [],
        (m: CompiledManifest) =>
          updatePlanFor(
            m.module,
            fieldRef("task", "*"),
          ).map((r) => `${r.entity}.${r.field}`),
      ),
    ),
    toEqual(["project.task-count"]),
  ));
