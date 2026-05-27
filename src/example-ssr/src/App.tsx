import { VNode } from "plgg-view";

/**
 * The shared view — authored once, rendered on **both** the server (to HTML)
 * and the client (to DOM). That is the whole point of an isomorphic app: one
 * component tree, two renderers (both from plgg-web, both over plgg-view).
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
    <h1>plgg-web isomorphic demo</h1>
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
