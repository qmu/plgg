import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { makeUrl } from "plgg-view/client";
import {
  makeApp,
  type Model,
  type Msg,
} from "./bizMenuDemo.ts";
import { type Rec, labelOf } from "./records.ts";

/**
 * Two-instance isolation — the proof that `update()` is
 * pure (ticket 20260708192518). Demo 1's records used to
 * live in a module-global `store.ts`, so a record created
 * in one `makeApp()` leaked into every other instance.
 * Now the records live in the Model and reach the scheduler
 * through a `dynamic` source, so two `makeApp()` instances
 * observably share NO created records.
 */
type App = ReturnType<typeof makeApp>;

const createOrbitClient = (app: App): Model => {
  const [formModel] = app.init(
    makeUrl("/", "?c=clients&add=client"),
  );
  const filled = (
    [
      {
        kind: "fieldInput",
        section: "clients",
        field: "name",
        value: "Orbit Systems",
      },
      {
        kind: "fieldInput",
        section: "clients",
        field: "status",
        value: "Active",
      },
      {
        kind: "fieldInput",
        section: "clients",
        field: "since",
        value: "2026",
      },
      {
        kind: "fieldInput",
        section: "clients",
        field: "contact",
        value: "Mina, Ops",
      },
      {
        kind: "fieldInput",
        section: "clients",
        field: "notes",
        value: "New implementation partner.",
      },
    ] satisfies ReadonlyArray<Msg>
  ).reduce(
    (m: Model, msg: Msg) => app.update(msg, m)[0],
    formModel,
  );
  return app.update(
    { kind: "formSubmit", section: "clients" },
    filled,
  )[0];
};

const named = (
  model: Model,
  name: string,
): boolean =>
  model.records.clients.some(
    (c: Rec) => labelOf("clients", c) === name,
  );

test("a record created in one makeApp() instance does not leak into another", () => {
  const app1 = makeApp("light");
  const app2 = makeApp("light");

  // Create a client in app1.
  const created = createOrbitClient(app1);
  // app2 starts fresh AFTER app1's create.
  const [fresh] = app2.init(
    makeUrl("/", "?c=clients"),
  );

  return all([
    // app1 saw its own create: seven clients incl. Orbit.
    check(
      created.records.clients.length,
      toBe(7),
    ),
    check(
      named(created, "Orbit Systems"),
      toBe(true),
    ),
    // app2 is untouched: the six seed clients, no Orbit —
    // no module-global store carried the record across.
    check(fresh.records.clients.length, toBe(6)),
    check(
      named(fresh, "Orbit Systems"),
      toBe(false),
    ),
  ]);
});
