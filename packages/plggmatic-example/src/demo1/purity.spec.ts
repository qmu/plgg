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
        kind: "clientNameInput",
        value: "Orbit Systems",
      },
      {
        kind: "clientStatusInput",
        value: "Active",
      },
      {
        kind: "clientSinceInput",
        value: "2026",
      },
      {
        kind: "clientContactInput",
        value: "Mina, Ops",
      },
      {
        kind: "clientNotesInput",
        value: "New implementation partner.",
      },
    ] satisfies ReadonlyArray<Msg>
  ).reduce(
    (m: Model, msg: Msg) =>
      app.update(msg, m)[0],
    formModel,
  );
  return app.update(
    { kind: "clientFormSubmit" },
    filled,
  )[0];
};

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
    check(created.clients.length, toBe(7)),
    check(
      created.clients.some(
        (c) => c.name === "Orbit Systems",
      ),
      toBe(true),
    ),
    // app2 is untouched: the six seed clients, no Orbit —
    // no module-global store carried the record across.
    check(fresh.clients.length, toBe(6)),
    check(
      fresh.clients.some(
        (c) => c.name === "Orbit Systems",
      ),
      toBe(false),
    ),
  ]);
});
