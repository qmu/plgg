# guide — Build this site

Corresponding chapters have the same relative path under site/ja and site/en. `site.config.ts` selects the base and labels for one shared sidebar structure. Use `npm run dev` while editing and `npm run build` for both editions and link checks. Finally `nest-exhibit.ts` copies the built plggmatic exhibit. Prepare the libraries and exhibit with `sh scripts/build.sh` from the repository root.

## Add a manuscript

Place Markdown at the same relative path in both editions. Use /tutorial/ even in English links since the build applies the locale base. Register the route in the sidebar in `site.config.ts` and follow it from both editions after building.
