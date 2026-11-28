# example — Run the to-do example

Build the workspace as described in [Getting started](/getting-started/), then run `npm run serve` in `packages/example`. Open the printed URL, add a task, mark it complete, and filter the list. Changing the search updates the URL, so you can use Back to revisit a filter.

Stop the server and run `npm run serve:ssr` to see the same `view` produce HTML on the server.

## Follow state into the view

Read `init`, `update` and `view` in `src/app.ts` to locate the draft and the saved tasks. `src/app.spec.ts` exercises both direct messages and actual DOM input events. SSR serializes the same view. Client startup rebuilds the root on first paint. Tasks live in the model and do not persist to a database.
