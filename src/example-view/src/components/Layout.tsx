import { VNode, Child } from "plgg-view";

/**
 * The page shell. It accepts **children** — whatever JSX is nested inside
 * `<Layout>…</Layout>` arrives as `props.children`, typed with plgg-view's own
 * `Child` type, and is dropped into the content slot. This is how you compose a
 * generic wrapper around feature components.
 */
export const Layout = (props: {
  title: string;
  remaining: number;
  children?: Child;
}): VNode => (
  <main id="app">
    <header class="bar">
      <h1 class="title">{props.title}</h1>
      <span class="count">{props.remaining} left</span>
    </header>
    <section class="content">{props.children}</section>
    <footer class="foot">built with plgg-view</footer>
  </main>
);
