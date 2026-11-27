# Join two sites by columns

Suppose your handbook links to a catalog on another site. Add the catalog’s origin to `partners` in the handbook, and the handbook’s origin to `embedders` in the catalog. To let readers start from either site, set both lists on each side.

Place this declaration in the handbook config, substituting the actual origins, then add `...connections` to the default-exported object. Use `frames` for a third-party widget the site already embeds. This grants permission to frame the widget without making it a column partner.

```ts
const connections = {
  partners: ["https://catalog.example.com"],
  embedders: ["https://catalog.example.com"],
  frames: ["https://widgets.example.com"],
};
```

Enter an exact HTTPS origin, including a port if needed. Leave off the trailing slash, path, and wildcards. HTTP is accepted for `localhost` and `127.0.0.1` during development. Rebuild the sites and apply the [response headers](/operations/) after changing the lists.

## What the reader sees

Write an ordinary link to a catalog page. Its column shows the partner’s title and hostname. Links inside it can open further columns on the host site or an allowed partner. The host’s light/dark setting follows the reader into the frame, and sideways scrolling moves between columns. If the partner doesn’t respond within four seconds, the column offers a direct link.

## What each site controls

The partner’s HTML runs in a sandboxed iframe on its own origin. It can neither edit the parent document nor navigate the top-level page. The host accepts a request to open a column only from a frame it created for that sender’s registered origin. Putting another hostname in a shared URL cannot grant it access. Local columns load only same-origin HTML, and the browser reads at most twelve additional entries from the URL’s `c` parameter.

With partners configured, the page’s `frame-src` policy limits frame destinations to the site itself, its partners, and its `frames` list, including after redirects. The serving site’s `frame-ancestors` response header controls who may frame its pages. Each partner remains responsible for the content it displays.
