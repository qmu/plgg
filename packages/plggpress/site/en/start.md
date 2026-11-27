# Build your first site

This walkthrough uses Node.js and npm to build a two-page handbook. For a fresh checkout, get the plgg source and run the workspace build script to install dependencies and prepare the CLI.

```sh
git clone https://github.com/qmu/plgg.git
cd plgg
sh scripts/build.sh
```

If you already have a built checkout, start at its root. Create a directory for your handbook.

```sh
mkdir -p handbook/docs
cd handbook
```

Create `site.config.ts`. Set `base` to the path where the site will be published and give the sidebar a link back to the home page.

```ts
export default {
  title: "Handbook",
  description: "A field guide",
  base: "/",
  nav: [],
  sidebar: [{ text: "Handbook", items: [
    { text: "Home", link: "/", items: [] },
  ] }],
  social: [],
  dev: { allowedHosts: [] },
};
```

Use `docs/index.md` for the home page. Put a second file beside it and link to it from the home page.

```sh
printf '# Handbook\n\n[Supplies](./supplies.md)\n' > docs/index.md
printf '# Supplies\n\nPack a pencil and a notebook.\n' > docs/supplies.md
npx plggpress dev --contentDir docs
```

Open `http://localhost:5173/` and choose **Supplies**. With the packing list open on the right, edit the sentence in `docs/supplies.md` and save. The browser reloads the page.

Press Ctrl+C to stop the dev server, then run the command below. Look for `dist/index.html` and `dist/supplies/index.html` in the output. See [Markdown and links](/markdown/) when you’re ready to add more pages.

```sh
npx plggpress build --contentDir docs --outDir dist
```
