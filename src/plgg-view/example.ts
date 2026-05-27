/**
 * plgg-view example — render a small page to an HTML string, the plgg way.
 *
 * Run it:
 *   npx tsx src/plgg-view/example.ts
 *
 * The whole view is pure data: components are plain functions `(props) => VNode`
 * composed with the `h` hyperscript, and `renderToString` is the single
 * data-last fold that turns the tree into escaped HTML. No classes, no hooks,
 * no DOM — this POC is static SSR only. JSX (`<p>…</p>`) compiles to these same
 * `h`/`jsx` calls; see README.md.
 */
import { SoftStr, pipe } from "plgg";
import {
  VNode,
  h,
  fragment,
  renderToString,
} from "plgg-view/index";

// --- function components: data in, VNode out, composed by application ---

type Post = Readonly<{ title: SoftStr; body: SoftStr }>;

const Heading = (props: { text: SoftStr }): VNode =>
  h("h1", { class: "title" }, props.text);

const Article = (post: Post): VNode =>
  h(
    "article",
    null,
    h("h2", null, post.title),
    h("p", null, post.body),
  );

const Page = (props: {
  heading: SoftStr;
  posts: ReadonlyArray<Post>;
}): VNode =>
  h(
    "main",
    { id: "app" },
    Heading({ text: props.heading }),
    // a list of children is just an array — `h` flattens it
    fragment(props.posts.map(Article)),
  );

// --- compose + render (a data-last pipeline) ---

const page = Page({
  heading: "plgg-view",
  posts: [
    {
      title: "Pure data views",
      // `&` and `<` below are escaped by renderToString — XSS-safe by default
      body: "Components return data, not strings. Tom & Jerry <3",
    },
    {
      title: "No framework",
      body: "Built only on plgg.",
    },
  ],
});

pipe(page, renderToString, (html) => console.log(html));
