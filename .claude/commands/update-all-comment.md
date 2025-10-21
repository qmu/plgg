Update/Add comments to every TypeScript file in the codebase.

* Find all `.ts` files in src/plgg, excluding `.spec.ts` test files.
* Supply JSDoc style comments to every exporting member starting from `/**` to multi lines.
* Comment concisely and clearly, more than 3 lines description is prohibited.
* Tags like `@param`, `@example`, `@template`, `@returns` are prohibited, erase if they exist.
* Add comments if missing, or update comments if outdated.
* Only update comments, do not modify any code logic or functionality.
* Process files in alphabetical order by directory and filename.