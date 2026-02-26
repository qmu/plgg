---
title: Accessibility Policy
description: Internationalization support, language coverage, translation workflows, and accessibility testing practices for plgg
category: developer
modified_at: 2026-02-26T00:00:00+09:00
commit_hash: ddbb696
---

[English](accessibility.md) | [Japanese](accessibility_ja.md)

# Accessibility Policy

This document describes the internationalization support, language coverage, translation workflows, and accessibility testing practices observable in the plgg monorepo (packages: `plgg`, `plgg-kit`, `plgg-foundry`). Every statement reflects only implemented and executable practices found in the repository. Areas with no codebase evidence are marked "not observed."

## Internationalization

No internationalization (i18n) framework or localization (l10n) library is configured in any package within this monorepo. plgg is a TypeScript functional programming utility library with no UI layer. The packages (`plgg`, `plgg-foundry`, `plgg-kit`) expose TypeScript APIs consumed programmatically; there are no user-facing rendered strings requiring locale-aware formatting or translation.

One incidental language-awareness pattern exists in `plgg-foundry`: the LLM blueprint generation prompt instructs the model to "Use the same language as the user request" for a diagnostic analysis field (source: `src/plgg-foundry/src/Foundry/usecase/blueprint.ts`, line 92). This is a prompt engineering instruction passed to an external LLM, not an i18n mechanism in the application code. No `Intl` API usage, locale configuration, or message catalog exists in the TypeScript source.

## Supported Languages

Not observed. No language codes, locale identifiers, or locale-specific content are declared in the application source. Because the library has no UI components and exports only programmatic TypeScript APIs, there is no enumerable list of supported user languages to document.

The developer documentation in `.workaholic/` is maintained bilingually in English (primary) and Japanese (translation counterpart files with `_ja.md` suffix). This is a documentation convention enforced by the project constraint in `.workaholic/constraints/project.md`, not an application i18n feature.

## Translation Workflow

Not observed for application code. No message extraction pipeline, translation memory, or localization workflow (such as `i18next`, `react-intl`, `gettext`, or equivalent) exists in any package.

For developer documentation under `.workaholic/`, the project constraint in `.workaholic/constraints/project.md` (Documentation Language section) requires every `.md` file to have a corresponding `_ja.md` translation counterpart. Compliance is enforced by policy convention and reviewed through the normal PR workflow; no automated tooling checks for the presence of translation files.

## Accessibility Testing

Not observed. No accessibility testing tooling is configured in any package. The quality context document (`.workaholic/specs/quality-context.md`, Accessibility section) explicitly records: "Standard: Not observed. No accessibility testing tooling is configured. Enforcement: Not observed."

The quality manager constraint document (`.workaholic/constraints/quality.md`, Unconstrained by Design section) states that accessibility is "Not applicable to this library project (no UI components)."

No `axe-core`, `jest-axe`, `pa11y`, `lighthouse`, `@testing-library/jest-dom`, or any other accessibility audit dependency exists in any `package.json`. No CI workflow step performs accessibility scanning. No ARIA, WCAG, or screen-reader test assertions appear in any test file.

## Observations

plgg is a headless TypeScript utility library. None of its three packages produce HTML, rendered output, or any user interface. The absence of i18n, l10n, and accessibility testing tooling is structurally appropriate: there are no UI surfaces for which these mechanisms would apply. The single language instruction in the `blueprint.ts` LLM prompt is an AI prompt engineering convention, not an application internationalization concern. Developer documentation follows a bilingual English/Japanese convention governed by `.workaholic/constraints/project.md`.

## Gaps

The following areas have no observed evidence. They are listed here for completeness, not as deficiencies requiring remediation, given the library's headless nature.

**Automated translation file enforcement**: No CI check or pre-commit hook verifies that every `.workaholic/` document has a `_ja.md` counterpart. The bilingual requirement in `.workaholic/constraints/project.md` is a policy constraint without automated enforcement. Compliance is entirely manual.

**i18n framework**: Not observed and not applicable. The library has no user-facing strings.

**Accessibility testing**: Not observed and not applicable. The library has no UI components.
