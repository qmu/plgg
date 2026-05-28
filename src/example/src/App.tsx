import { pipe, matchOption } from "plgg";
import { VNode } from "plgg-view";
import { Article } from "./modeling/Article";

/**
 * The shared view — authored once, rendered on **both** the server (to HTML, see
 * [server/app.ts]) and the client (to DOM, see [csr/client.tsx]). It takes the
 * articles as data, so the SAME tree renders the SAME plgg-sql-backed rows on
 * the server and after the client hydrates. One component tree, two renderers
 * (both over plgg-view): that is what makes the app isomorphic.
 */
const ArticleItem = (props: {
  article: Article;
}): VNode => (
  <li class="article">
    <h2>{props.article.name}</h2>
    {pipe(
      props.article.memo,
      matchOption(
        (): VNode => (
          <p class="memo empty">(no memo)</p>
        ),
        (memo: string): VNode => (
          <p class="memo">{memo}</p>
        ),
      ),
    )}
  </li>
);

export const App = (props: {
  articles: ReadonlyArray<Article>;
}): VNode => (
  <main id="app">
    <h1>plgg full-stack demo</h1>
    <p>
      These articles were read from a plgg-sql (node:sqlite) database, rendered
      to HTML on the server with plgg-view, and re-rendered in the browser by the
      same component tree. A plgg-http-client script consumes the same JSON API.
    </p>
    <ul class="articles">
      {props.articles.map((article) => (
        <ArticleItem article={article} />
      ))}
    </ul>
  </main>
);
