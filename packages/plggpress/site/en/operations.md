# Build and publish the site

Run `npx plggpress build --contentDir docs --outDir dist` to [check the content](/checks/) and write the pages to `dist`. Choose a dedicated output directory because each build replaces it. The output also contains the contents of `docs/public`, a `404.html` error page, and the JavaScript for parts used on the site.

For this guide, run `npm run build:site` in `packages/plggpress`. It builds Japanese into `dist-site` first, then English into `dist-site/en`. Building the root last would erase the English output. Publish the enclosing `dist-site` directory to serve both editions.

## Deploy to Cloudflare

This site uses Cloudflare Workers static assets. To serve your own `dist` directory, put a `wrangler.jsonc` file like this next to the site config. Choose a Worker name for your project.

```json
{
  "name": "field-handbook",
  "compatibility_date": "2026-08-01",
  "assets": {
    "directory": "./dist",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  }
}
```

Sign in to the target account with Wrangler, then run `npx wrangler deploy` after the build. For a custom domain, add a `routes` entry with your hostname in `pattern` and `custom_domain: true`, as this site does.

## Deliver the framing policy

When `embedders` contains entries, the build writes a `Content-Security-Policy: frame-ancestors 'self' …` rule for `/*` to the output’s `_headers` file. If the content directory contains `public/_headers`, its rules are copied first and the generated rule is appended. The rule at the root of this guide covers `/en/` too.

Inspect an HTML response in the browser’s Network panel after deployment. On a host that doesn’t read `_headers`, configure the equivalent response header on the server. See [Joining sites](/joining/) for the settings the other site needs.
