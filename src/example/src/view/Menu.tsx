import { VNode } from "plgg-view";

type Link = Readonly<{ href: string; label: string }>;

/**
 * A top-level **fragment** (no wrapping element) grouping a heading and a nav,
 * plus **list rendering** — `links.map(...)` dropped straight into children,
 * which plgg-view flattens. No `key` bookkeeping (this POC is static).
 */
export const Menu = (props: {
  title: string;
  links: ReadonlyArray<Link>;
}): VNode => (
  <>
    <h2 class="menu-title">{props.title}</h2>
    <nav class="menu">
      {props.links.map((link) => (
        <a href={link.href}>{link.label}</a>
      ))}
    </nav>
  </>
);
