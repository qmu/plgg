import { VNode } from "plgg-view";

/**
 * The shared view — authored once, rendered on **both** the server (to HTML, see
 * [ssr/server.ts]) and the client (to DOM, see [csr/client.tsx]). One component
 * tree, two renderers (both from plgg-http-router, both over plgg-view): that is what
 * makes the app isomorphic.
 */
type Feature = Readonly<{ name: string; done: boolean }>;

const FEATURES: ReadonlyArray<Feature> = [
  { name: "Server-side rendering", done: true },
  { name: "Client-side rendering", done: true },
  { name: "Reactivity", done: false },
];

const FeatureItem = (props: { feature: Feature }): VNode => (
  <li class={props.feature.done ? "done" : "todo"}>
    {props.feature.done ? "✓ " : "○ "}
    {props.feature.name}
  </li>
);

export const App = (): VNode => (
  <main id="app">
    <h1>plgg-http-router isomorphic demo</h1>
    <p>
      This page was server-rendered, then re-rendered on the client by the same
      component tree.
    </p>
    <ul class="features">
      {FEATURES.map((feature) => (
        <FeatureItem feature={feature} />
      ))}
    </ul>
  </main>
);
